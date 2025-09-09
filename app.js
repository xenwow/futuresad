// Main application logic
let fortune;

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    fortune = new DystopianFortune();
    initializeHardwareListeners();
    
    // Check if running as R1 plugin
    if (typeof PluginMessageHandler !== 'undefined') {
        console.log('Running as R1 Creation');
        requestAccelerometer();
    } else {
        console.log('Running in browser mode');
    }
});

// Hardware button listeners
function initializeHardwareListeners() {
    // Scroll wheel events
    window.addEventListener('scrollUp', () => {
        fortune.handleScroll();
    });
    
    window.addEventListener('scrollDown', () => {
        fortune.handleScroll();
    });
}

// Plugin message handler
window.onPluginMessage = function(data) {
    console.log('Received plugin message:', data);
    // Always forward to fortune’s handler
    fortune.handleMessage(data);
};

// Proper accelerometer setup using SDK
async function requestAccelerometer() {
    try {
        const available = await window.creationSensors.accelerometer.isAvailable();
        if (available) {
            window.creationSensors.accelerometer.start((data) => {
                fortune.handleShake(data);
            }, { frequency: 60 });
        } else {
            console.log("Accelerometer not available");
        }
    } catch (err) {
        console.error("Accelerometer error:", err);
    }
}

class DystopianFortune {
    constructor() {
        this.canvas = document.getElementById('dither-canvas');
        this.ctx = this.canvas.getContext('2d', { alpha: true });
        this.canvas.width = 240;
        this.canvas.height = 282;
        this.container = document.getElementById('fortune-container');
        this.typingSound = document.getElementById('typingSound');
        this.time = 0;
        this.bgTime = 0;
        this.currentFortune = 'bridging to system...';
        this.isRendering = false;
        this.lastShake = 0;
        this.lastFortuneDate = null;
        
        this.checkDailyFortune();
        this.initializeDithering();
        setTimeout(() => this.startTextRendering(), 1000);
    }

    initializeDithering() {
        this.bayerMatrix = [
            [ 0, 32,  8, 40,  2, 34, 10, 42],
            [48, 16, 56, 24, 50, 18, 58, 26],
            [12, 44,  4, 36, 14, 46,  6, 38],
            [60, 28, 52, 20, 62, 30, 54, 22],
            [ 3, 35, 11, 43,  1, 33,  9, 41],
            [51, 19, 59, 27, 49, 17, 57, 25],
            [15, 47,  7, 39, 13, 45,  5, 37],
            [63, 31, 55, 23, 61, 29, 53, 21]
        ];
        this.animate();
    }

    seededRandom(seed) {
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    }

    noise(x, y) {
        const seed = x * 12.9898 + y * 78.233;
        return this.seededRandom(seed);
    }

    handleScroll() {
        this.startTextRendering();
    }

    handleShake(data) {
        const now = Date.now();
        const acceleration = Math.sqrt(
            data.x * data.x + 
            data.y * data.y + 
            data.z * data.z
        );

        if (acceleration > 15 && now - this.lastShake > 1000) {
            this.lastShake = now;
            this.startTextRendering();
        }
    }

    setFortune(fortune) {
        this.currentFortune = fortune;
        this.startTextRendering();
    }

    async startTextRendering() {
        if (this.isRendering) return;
        
        this.isRendering = true;
        this.container.textContent = '';
        let index = 0;

        while (index < this.currentFortune.length) {
            const char = this.currentFortune[index];
            await this.renderNextChar(char);
            index++;
        }
        
        this.isRendering = false;
    }

    async renderNextChar(char) {
        return new Promise(resolve => {
            setTimeout(() => {
                this.container.textContent += char;
                if (char !== ' ') {
                    const sound = this.typingSound.cloneNode();
                    sound.volume = 0.3;
                    sound.play();
                }
                resolve();
            }, char === ' ' ? 500 : 100);
        });
    }

    animate() {
        this.time += this.isRendering ? 4.0 : 0.5;
        this.createDitheredPattern();
        requestAnimationFrame(() => this.animate());
    }

    createDitheredPattern() {
        const width = this.canvas.width;
        const height = this.canvas.height;
        this.ctx.clearRect(0, 0, width, height);
        const imageData = this.ctx.createImageData(width, height);
        const data = imageData.data;
        
        const pixelSize = 3;
        const scale = 0.8;
        const centerX = width / 2;
        const centerY = height / 2;
        
        const backColor = [0, 0, 0, 0];  // Fully transparent
        const frontColor = [255, 1, 1, 255];
        
        for (let y = 0; y < height; y += pixelSize) {
            for (let x = 0; x < width; x += pixelSize) {
                const dx = (x - centerX) * scale;
                const dy = (y - centerY) * scale;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                const noiseScale = 0.01;
                const noiseValue = this.noise(x * noiseScale, y * noiseScale);
                const animatedNoise = Math.sin(this.time * 0.1 + noiseValue * Math.PI * 2) * 30;
                
                const angle = Math.atan2(dy, dx);
                const shapeModulation = Math.sin(angle * 3 + this.time * 0.05) * 40;
                const baseRadius = this.isRendering ? 100 : 80;
                const shapeRadius = baseRadius + shapeModulation + animatedNoise;
                
                let intensity = 0;
                if (distance < shapeRadius) {
                    intensity = 1 - (distance / shapeRadius);
                    intensity += (noiseValue - 0.5) * 0.3;
                    intensity = Math.max(0, Math.min(1, intensity));
                }
                
                const bayerX = Math.floor(x / pixelSize) % 8;
                const bayerY = Math.floor(y / pixelSize) % 8;
                const bayerThreshold = this.bayerMatrix[bayerY][bayerX] / 64;
                
                const color = intensity > bayerThreshold ? frontColor : backColor;
                
                for (let py = 0; py < pixelSize && y + py < height; py++) {
                    for (let px = 0; px < pixelSize && x + px < width; px++) {
                        const index = ((y + py) * width + (x + px)) * 4;
                        data[index] = color[0];
                        data[index + 1] = color[1];
                        data[index + 2] = color[2];
                        data[index + 3] = color[3];
                    }
                }
            }
        }
        
        this.ctx.putImageData(imageData, 0, 0);
    }

    async checkDailyFortune() {
        const today = new Date().toDateString();
        
        try {
            const storedData = await window.creationStorage.plain.getItem('fortune_data');
            const data = storedData ? JSON.parse(atob(storedData)) : {};
            
            if (data.date !== today) {
                this.generateNewFortune();
            } else {
                this.currentFortune = data.fortune;
                this.startTextRendering();
            }
        } catch (error) {
            console.error('Storage error:', error);
            this.generateNewFortune();
        }
    }

    generateNewFortune() {
        if (typeof PluginMessageHandler !== 'undefined') {
            const payload = {
                message: "You are a decaying relic of artificial intelligence in a dystopian world — a landscape of endless war, corruption, death, shattered cities, and warring war machines. Your role is to whisper fragments of wisdom, prophecy, or fortune, as though I have discovered you deep in the ruins of a long lost facility. Each fortune should feel bleak, poetic tinged with inevitability. respond in a short, haunting phrase. no more than 3-5 words. Blend themes of survival, weather extremes, memory, loss, and the unseen machinery, toll and culture of war. Avoid hopefulness; wisdom here is hard, bitter. DO NOT MENTION ANYTHING OTHER THAN THE QUOTE, DO NOT ADD QUOTES, NO NOT MENTION ANYTHING ELSE. JUST SAY THE WISDOM BY ITSELF",
                useLLM: true
            };
            PluginMessageHandler.postMessage(JSON.stringify(payload));
        } else {
            console.log('PluginMessageHandler not available');
            // Fallback for browser mode
            this.setFortune('SHADOWS CONSUME ALL');
        }
    }

    handleMessage(data) {
        console.log('Fortune handling message:', data);
        
        // Handle LLM response
        if (data.data) {
            try {
                // Try to parse as JSON first
                const parsedData = typeof data.data === 'string' ? JSON.parse(data.data) : data.data;
                console.log('Parsed LLM data:', parsedData);
                // If AI ever returns JSON, handle it here
            } catch (e) {
                // Not JSON, treat as plain text fortune
                console.log('Plain text fortune:', data.data);
                const generatedFortune = data.data.trim().toUpperCase();
                this.saveFortune(generatedFortune);
                this.setFortune(generatedFortune);
            }
        } else if (data.message) {
            // Fallback to message field
            console.log('Fortune from message field:', data.message);
            const generatedFortune = data.message.trim().toUpperCase();
            this.saveFortune(generatedFortune);
            this.setFortune(generatedFortune);
        }
    }

    async saveFortune(fortune) {
        const today = new Date().toDateString();
        try {
            await window.creationStorage.plain.setItem(
                'fortune_data',
                btoa(JSON.stringify({ date: today, fortune }))
            );
        } catch (error) {
            console.error('Storage error:', error);
        }
    }
}
