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
    window.addEventListener('scrollUp', () => fortune.handleScroll());
    window.addEventListener('scrollDown', () => fortune.handleScroll());
}

// Plugin message handler
window.onPluginMessage = function(data) {
    console.log('Received plugin message:', data);
    if (fortune && typeof fortune.handleMessage === 'function') {
        fortune.handleMessage(data);
    }
};

// Proper accelerometer setup
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
        this.currentFortune = 'CALCULATING YOUR DESTINY...';
        this.isRendering = false;
        this.lastShake = 0;

        this.checkDailyFortune();
        this.initializeDithering();
        setTimeout(() => this.startTextRendering(), 1000);
    }

    initializeDithering() {
        this.bayerMatrix = [
            [ 0,32, 8,40, 2,34,10,42],
            [48,16,56,24,50,18,58,26],
            [12,44, 4,36,14,46, 6,38],
            [60,28,52,20,62,30,54,22],
            [ 3,35,11,43, 1,33, 9,41],
            [51,19,59,27,49,17,57,25],
            [15,47, 7,39,13,45, 5,37],
            [63,31,55,23,61,29,53,21]
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

    handleScroll() { this.startTextRendering(); }

    handleShake(data) {
        const now = Date.now();
        const acceleration = Math.sqrt(data.x*data.x + data.y*data.y + data.z*data.z);
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
        for (let i = 0; i < this.currentFortune.length; i++) {
            await this.renderNextChar(this.currentFortune[i]);
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
        const w = this.canvas.width, h = this.canvas.height;
        this.ctx.clearRect(0,0,w,h);
        const img = this.ctx.createImageData(w,h), d = img.data;
        const px=3, scale=0.8, cx=w/2, cy=h/2;
        const back=[0,0,0,0], front=[255,1,1,255];
        for (let y=0;y<h;y+=px){
          for (let x=0;x<w;x+=px){
            const dx=(x-cx)*scale, dy=(y-cy)*scale, dist=Math.sqrt(dx*dx+dy*dy);
            const n=this.noise(x*0.01,y*0.01);
            const an=Math.sin(this.time*0.1+n*Math.PI*2)*30;
            const angle=Math.atan2(dy,dx);
            const sm=Math.sin(angle*3+this.time*0.05)*40;
            const base=this.isRendering?100:80;
            const r=base+sm+an;
            let intensity=0;
            if(dist<r){
              intensity=1-(dist/r);
              intensity+=(n-0.5)*0.3;
              intensity=Math.max(0,Math.min(1,intensity));
            }
            const bx=Math.floor(x/px)%8, by=Math.floor(y/px)%8;
            const th=this.bayerMatrix[by][bx]/64;
            const col=intensity>th?front:back;
            for(let py=0;py<px&&y+py<h;py++){
              for(let px2=0;px2<px&&x+px2<w;px2++){
                const idx=((y+py)*w+(x+px2))*4;
                d[idx]=col[0];d[idx+1]=col[1];d[idx+2]=col[2];d[idx+3]=col[3];
              }
            }
          }
        }
        this.ctx.putImageData(img,0,0);
    }

    async checkDailyFortune() {
        const today = new Date().toDateString();
        try {
            const stored = await window.creationStorage.plain.getItem('fortune_data');
            const data = stored ? JSON.parse(atob(stored)) : {};
            if (data.date !== today) {
                this.generateNewFortune();
            } else {
                this.currentFortune = data.fortune;
                this.startTextRendering();
            }
        } catch (e) {
            console.error('Storage error:', e);
            this.generateNewFortune();
        }
    }

    generateNewFortune() {
        if (typeof PluginMessageHandler !== 'undefined') {
            const payload = {
                message: "You are a decaying relic of artificial intelligence in a dystopian world — a landscape of endless war, corruption, death, shattered cities, and warring war machines. Your role is to whisper fragments of wisdom, prophecy, or fortune, as though I have discovered you deep in the ruins of a long lost facility. Each fortune should feel bleak, poetic tinged with inevitability. Respond in a short, haunting phrase (3–5 words). Avoid hope; make it bitter. Output ONLY the phrase, nothing else.",
                useLLM: true
            };
            PluginMessageHandler.postMessage(JSON.stringify(payload));
        } else {
            console.log('PluginMessageHandler not available');
            this.setFortune('SHADOWS CONSUME ALL');
        }
    }

    handleMessage(data) {
    console.log('Fortune handling message:', data);

    // Check data.data field first (this is where LLM JSON responses come)
    if (data.data) {
        console.log('Found data.data:', data.data);
        try {
            // Handle if data.data is already an object or a string
            const parsed = typeof data.data === 'string' ? JSON.parse(data.data) : data.data;
            console.log('Parsed data:', parsed);
            
            // Look for common response formats
            if (parsed.fortune) {
                const f = parsed.fortune.trim().toUpperCase();
                this.saveFortune(f);
                this.setFortune(f);
                return;
            }
            
            // If no fortune field, but it's a parsed object, use the whole response
            const f = JSON.stringify(parsed).trim().toUpperCase();
            this.saveFortune(f);
            this.setFortune(f);
            return;
        } catch (e) {
            console.error('Error parsing data.data:', e);
            // data.data wasn't valid JSON, treat as plain text
            const f = data.data.trim().toUpperCase();
            this.saveFortune(f);
            this.setFortune(f);
            return;
        }
    }

    // Also check message field (this is where plain text responses come)
    if (data.message) {
        console.log('Found data.message:', data.message);
        
        // Try to parse message as JSON first
        try {
            const parsed = JSON.parse(data.message);
            if (parsed.fortune) {
                const f = parsed.fortune.trim().toUpperCase();
                this.saveFortune(f);
                this.setFortune(f);
                return;
            }
        } catch (e) {
            // Not JSON, use as plain text
        }
        
        const f = data.message.trim().toUpperCase();
        this.saveFortune(f);
        this.setFortune(f);
    }


    async saveFortune(fortune) {
        const today = new Date().toDateString();
        try {
            await window.creationStorage.plain.setItem(
                'fortune_data',
                btoa(JSON.stringify({ date: today, fortune }))
            );
        } catch (e) {
            console.error('Storage error:', e);
        }
    }
}
