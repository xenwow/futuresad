class MindfulnessApp {
    constructor() {
        this.entries = [];
        this.loadEntries();
        this.initMessageHandler();
    }

    async loadEntries() {
        try {
            const data = await window.creationStorage.secure.getItem('entries');
            if (data) {
                this.entries = JSON.parse(atob(data));
                this.renderEntries();
            }
        } catch (e) {
            console.error('Failed to load entries:', e);
        }
    }

    async saveEntries() {
        try {
            await window.creationStorage.secure.setItem('entries', 
                btoa(JSON.stringify(this.entries))
            );
        } catch (e) {
            console.error('Failed to save entries:', e);
        }
    }

    initMessageHandler() {
        window.onPluginMessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'photo') {
                this.addEntry('photo', data.content);
            } else if (data.type === 'audio') {
                this.addEntry('audio', data.content);
            }
        };
    }

    addEntry(type, content) {
        const entry = {
            type,
            content,
            timestamp: new Date().toISOString()
        };
        this.entries.unshift(entry);
        this.saveEntries();
        this.renderEntries();
    }

    renderEntries() {
        const container = document.getElementById('entries');
        container.innerHTML = '';
        
        this.entries.forEach(entry => {
            const div = document.createElement('div');
            div.className = 'entry';
            
            const time = new Date(entry.timestamp).toLocaleTimeString();
            
            if (entry.type === 'note') {
                div.textContent = `${time}: ${entry.content}`;
            } else if (entry.type === 'photo') {
                div.innerHTML = `
                    ${time}<br>
                    <img src="data:image/jpeg;base64,${entry.content}">
                `;
            } else if (entry.type === 'audio') {
                div.innerHTML = `
                    ${time}<br>
                    <audio controls src="data:audio/wav;base64,${entry.content}"></audio>
                `;
            }
            
            container.appendChild(div);
        });
    }
}

const app = new MindfulnessApp();

function takeMemo() {
    PluginMessageHandler.postMessage(JSON.stringify({
        action: 'record_audio'
    }));
}

function takePhoto() {
    PluginMessageHandler.postMessage(JSON.stringify({
        action: 'take_photo'
    }));
}

function addNote() {
    PluginMessageHandler.postMessage(JSON.stringify({
        message: "What's on your mind?",
        useLLM: false,
        callback: (response) => {
            app.addEntry('note', response);
        }
    }));
}