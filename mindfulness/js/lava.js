class LavaLamp {
    constructor() {
        this.canvas = document.getElementById('lavaLamp');
        this.ctx = this.canvas.getContext('2d');
        this.blobs = [];
        this.colors = ['#FF6B6B', '#4ECDC4', '#45B7D1'];
        this.resize();
        this.init();
        this.animate();
        
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        this.canvas.width = 240;
        this.canvas.height = 282;
    }

    init() {
        for (let i = 0; i < 3; i++) {
            this.blobs.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                radius: 30 + Math.random() * 20,
                color: this.colors[i],
                vx: Math.random() * 2 - 1,
                vy: Math.random() * 2 - 1
            });
        }
    }

    drawDitheredCircle(x, y, radius, color) {
        const rgb = this.hexToRgb(color);
        for (let px = x - radius; px < x + radius; px++) {
            for (let py = y - radius; py < y + radius; py++) {
                const dist = Math.sqrt((px - x) ** 2 + (py - y) ** 2);
                if (dist < radius) {
                    if (Math.random() > dist / radius) {
                        this.ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},0.5)`;
                        this.ctx.fillRect(px, py, 1, 1);
                    }
                }
            }
        }
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    animate() {
        this.ctx.fillStyle = '#1a1a1a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.blobs.forEach(blob => {
            blob.x += blob.vx;
            blob.y += blob.vy;

            if (blob.x < 0 || blob.x > this.canvas.width) blob.vx *= -1;
            if (blob.y < 0 || blob.y > this.canvas.height) blob.vy *= -1;

            this.drawDitheredCircle(blob.x, blob.y, blob.radius, blob.color);
        });

        requestAnimationFrame(() => this.animate());
    }
}

new LavaLamp();