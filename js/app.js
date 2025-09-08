class ASCIIConverter {
    constructor() {
        this.ascii = ' .:-=+*#%@';
        this.colored = false;
        this.contrast = 1.5;
        this.output = document.getElementById('ascii-output');
        this.setupListeners();
        
        // Hide range input since we'll use scroll wheel
        document.getElementById('contrast').style.display = 'none';
    }

    setupListeners() {
        document.getElementById('capture').addEventListener('click', () => this.capture());
        document.getElementById('toggle').addEventListener('click', () => this.toggleColor());
        
        // Use R1 hardware controls
        window.addEventListener('scrollUp', () => {
            this.contrast = Math.min(3, this.contrast + 0.1);
            this.processLastImage();
        });
        
        window.addEventListener('scrollDown', () => {
            this.contrast = Math.max(1, this.contrast - 0.1);
            this.processLastImage();
        });
        
        window.addEventListener('sideClick', () => this.capture());
    }

    capture() {
        // Use Creation SDK camera API
        window.creationCamera.takePhoto().then(photoData => {
            window.creationStorage.plain.setItem('lastImage', photoData);
            this.convertToASCII(photoData);
        }).catch(err => {
            console.error('Camera error:', err);
        });
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

// Initialize app
const app = new ASCIIConverter();