class ASCIIConverter {
    constructor() {
        this.ascii = ' .:-=+*#%@';
        this.colored = false;
        this.contrast = 1.5;
        this.output = document.getElementById('ascii-output');
        this.setupListeners();
    }

    setupListeners() {
        document.getElementById('capture').addEventListener('click', () => this.capture());
        document.getElementById('toggle').addEventListener('click', () => this.toggleColor());
        document.getElementById('contrast').addEventListener('input', (e) => {
            this.contrast = parseFloat(e.target.value);
            this.processLastImage();
        });
    }

    capture() {
        PluginMessageHandler.postMessage(JSON.stringify({
            action: 'take_photo'
        }));
    }

    toggleColor() {
        this.colored = !this.colored;
        this.processLastImage();
    }

    async processLastImage() {
        try {
            const data = await window.creationStorage.plain.getItem('lastImage');
            if (data) {
                this.convertToASCII(data);
            }
        } catch (e) {
            console.error('Failed to process image:', e);
        }
    }

    convertToASCII(base64Image) {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Scale to fit screen width while maintaining aspect ratio
            const scale = 240 / img.width;
            canvas.width = 240;
            canvas.height = img.height * scale;
            
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            let ascii = '';
            for (let y = 0; y < canvas.height; y += 4) {
                for (let x = 0; x < canvas.width; x += 2) {
                    const i = (y * canvas.width + x) * 4;
                    const brightness = (
                        imageData.data[i] * 0.299 +
                        imageData.data[i + 1] * 0.587 +
                        imageData.data[i + 2] * 0.114
                    ) / 255;
                    
                    const adjusted = Math.pow(brightness, this.contrast);
                    const char = this.ascii[Math.floor(adjusted * (this.ascii.length - 1))];
                    
                    if (this.colored && brightness > 0.7) {
                        ascii += `<span style="color:#FF4D00">${char}</span>`;
                    } else {
                        ascii += char;
                    }
                }
                ascii += '\\n';
            }
            
            this.output.innerHTML = ascii;
        };
        img.src = 'data:image/jpeg;base64,' + base64Image;
    }
}

const app = new ASCIIConverter();

window.onPluginMessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'photo') {
        window.creationStorage.plain.setItem('lastImage', data.content);
        app.convertToASCII(data.content);
    }
};