import * as THREE from 'three';

export class Environment {
    constructor(sceneManager, cacheLines = 8, memoryBlocks = 64) {
        this.scene = sceneManager.scene;
        this.cacheLinesCount = cacheLines;
        this.memoryBlocksCount = memoryBlocks;

        this.blocks = {}; // To map block index to 3D object
        this.cacheLines = {}; // To map cache line index to 3D object
        this.labels = [];

        this.buildCPU();
        this.buildCache();
        this.buildMemory();
        this.addLabels();

        // Active floating block that moves around
        this.activeBlock = this.createHighlightBlock();
    }

    buildCPU() {
        this.cpu = new THREE.Group();
        this.cpu.position.set(-15, 0, 0);

        // Base socket
        const socketGeom = new THREE.BoxGeometry(4, 0.4, 4);
        const socketMat = new THREE.MeshStandardMaterial({
            color: 0x1f2937,
            roughness: 0.8,
            metalness: 0.2
        });
        const socket = new THREE.Mesh(socketGeom, socketMat);
        socket.position.y = -0.2;
        this.cpu.add(socket);

        // CPU Chip (Die)
        const chipGeom = new THREE.BoxGeometry(2.8, 0.4, 2.8);
        const chipMat = new THREE.MeshStandardMaterial({
            color: 0x8b5cf6, // Purple accent 
            roughness: 0.3,
            metalness: 0.7
        });
        const chip = new THREE.Mesh(chipGeom, chipMat);
        chip.position.y = 0.2;
        this.cpu.add(chip);

        // Inner glowing core
        const coreGeom = new THREE.BoxGeometry(1.2, 0.45, 1.2);
        const coreMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0xa855f7,
            emissiveIntensity: 0.6
        });
        const core = new THREE.Mesh(coreGeom, coreMat);
        core.position.y = 0.2;
        this.cpu.add(core);

        // Circular base plate below everything
        const baseGeom = new THREE.CylinderGeometry(3.5, 4, 0.5, 32);
        const baseMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.5, roughness: 0.8 });
        const base = new THREE.Mesh(baseGeom, baseMat);
        base.position.y = -0.65;
        this.cpu.add(base);

        this.scene.add(this.cpu);
    }

    buildCache() {
        // Cache Rack Chassis (glass-like enclosure)
        const rackHeight = this.cacheLinesCount * 1.5 + 1;
        const rackGeom = new THREE.BoxGeometry(4.8, rackHeight, 2.8);
        const rackMat = new THREE.MeshStandardMaterial({
            color: 0x3b82f6,
            transparent: true,
            opacity: 0.15,
            roughness: 0.1,
            metalness: 0.9,
            side: THREE.BackSide
        });
        this.cacheRack = new THREE.Mesh(rackGeom, rackMat);
        this.cacheRack.position.set(0, 0.75, 0); // Centered vertically
        this.scene.add(this.cacheRack);

        // Cache lines (Server Blades)
        const bladeGeom = new THREE.BoxGeometry(4.2, 0.8, 2.2);

        for (let i = 0; i < this.cacheLinesCount; i++) {
            const material = new THREE.MeshStandardMaterial({
                color: 0x2d3748, // dark grey when empty
                transparent: true,
                opacity: 0.95,
                roughness: 0.3,
                metalness: 0.6,
                emissive: 0x000000
            });
            const mesh = new THREE.Mesh(bladeGeom, material);
            const yPos = (this.cacheLinesCount / 2 - i) * 1.5;
            mesh.position.set(0, yPos, 0);

            // Front metallic handle panel
            const handleGeom = new THREE.BoxGeometry(0.3, 0.6, 2.3);
            const handleMat = new THREE.MeshStandardMaterial({ color: 0x9ca3af, metalness: 0.8, roughness: 0.2 });
            const handle = new THREE.Mesh(handleGeom, handleMat);
            handle.position.set(-2.1, 0, 0); // Facing the CPU
            mesh.add(handle);

            // LED Status dual-lights
            const ledGeom = new THREE.BoxGeometry(0.1, 0.15, 0.3);
            const ledMat = new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x10b981, emissiveIntensity: 0.4 });
            const led = new THREE.Mesh(ledGeom, ledMat);
            led.position.set(-2.25, 0, -0.6);
            mesh.add(led);

            // Add subtle neon edges
            const edges = new THREE.EdgesGeometry(bladeGeom);
            const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.3 }));
            mesh.add(line);

            // Add dynamic data label
            if (!this.cacheBlockLabels) this.cacheBlockLabels = {};
            const dataLabel = this.createTextSprite('EMPTY', '#e2e8f0');
            dataLabel.position.set(3.5, 0, 0); // Position to the right of the blade
            dataLabel.scale.set(4, 1, 1);
            mesh.add(dataLabel);
            this.cacheBlockLabels[i] = dataLabel;

            this.scene.add(mesh);
            this.cacheLines[i] = mesh;
        }
    }

    buildMemory() {
        // Dynamic grid based on total blocks 
        const cols = Math.ceil(Math.sqrt(this.memoryBlocksCount));
        const rows = Math.ceil(this.memoryBlocksCount / cols);

        // Vertical RAM-Stick geometry
        const geometry = new THREE.BoxGeometry(0.3, 1.2, 1.0);

        for (let i = 0; i < this.memoryBlocksCount; i++) {
            // High-end glass/metal material
            const material = new THREE.MeshPhysicalMaterial({
                color: 0x3b82f6,
                roughness: 0.4,
                metalness: 0.6,
                clearcoat: 0.8,
                clearcoatRoughness: 0.2,
                emissive: 0x000000
            });
            const mesh = new THREE.Mesh(geometry, material);

            const row = Math.floor(i / cols);
            const col = i % cols;

            // Center the grid dynamically around the starting axis point
            const yPos = ((rows / 2) - row) * 1.5;
            const zPos = (col - (cols / 2)) * 1.5 + 0.75;

            mesh.position.set(15, yPos, zPos);

            // Circuit-board border highlight
            const edges = new THREE.EdgesGeometry(geometry);
            const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x60a5fa, transparent: true, opacity: 0.4 }));
            mesh.add(line);

            // Give it a tiny metallic RAM heatsink "ridge" on top
            const topRidgeGeom = new THREE.BoxGeometry(0.35, 0.1, 1.0);
            const topRidgeMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.8 });
            const topRidge = new THREE.Mesh(topRidgeGeom, topRidgeMat);
            topRidge.position.set(0, 0.65, 0);
            mesh.add(topRidge);

            this.scene.add(mesh);
            this.blocks[i] = mesh;
        }
    }

    addLabels() {
        const cpuLabel = this.createTextSprite('CPU', '#a78bfa');
        cpuLabel.position.set(-15, 3.5, 0);
        this.scene.add(cpuLabel);
        this.labels.push(cpuLabel);

        const cacheLabel = this.createTextSprite('CACHE', '#10b981');
        cacheLabel.position.set(0, 7.5, 0);
        this.scene.add(cacheLabel);
        this.labels.push(cacheLabel);

        const memLabel = this.createTextSprite('MAIN MEMORY', '#60a5fa');
        memLabel.position.set(15, 7.5, 0);
        this.scene.add(memLabel);
        this.labels.push(memLabel);
    }

    clearScene() {
        if (this.cpu) this.scene.remove(this.cpu);
        if (this.cacheRack) this.scene.remove(this.cacheRack);
        for (const k in this.cacheLines) this.scene.remove(this.cacheLines[k]);
        for (const k in this.blocks) this.scene.remove(this.blocks[k]);
        for (const lbl of this.labels) this.scene.remove(lbl);
        if (this.activeBlock) this.scene.remove(this.activeBlock);

        this.cacheLines = {};
        this.blocks = {};
        this.labels = [];
        this.cacheBlockLabels = {};
    }

    createTextSprite(message, color) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = color;
        ctx.font = 'bold 64px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(message, 256, 64);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(8, 2, 1);
        return sprite;
    }

    createHighlightBlock() {
        const geometry = new THREE.BoxGeometry(1.2, 1.2, 1.2);
        const material = new THREE.MeshStandardMaterial({
            color: 0xf59e0b,
            emissive: 0xf59e0b,
            emissiveIntensity: 0.5,
            transparent: true,
            opacity: 0.0
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(this.cpu.position);
        this.scene.add(mesh);
        return mesh;
    }

    // Utility to get positions for animations
    getCPUPos() { return this.cpu.position; }
    getCacheLinePos(index) { return this.cacheLines[index].position; }
    getMemoryBlockPos(index) { return this.blocks[index].position; }

    // Status highlights
    setCacheLineStatus(index, status) {
        const line = this.cacheLines[index];
        if (!line) return;

        if (status === 'HIT') {
            line.material.emissive.setHex(0x10b981);
            line.material.emissiveIntensity = 0.8;
            line.material.color.setHex(0x10b981);
        } else if (status === 'MISS') {
            line.material.emissive.setHex(0xef4444);
            line.material.emissiveIntensity = 0.8;
            line.material.color.setHex(0xef4444);
        } else if (status === 'IDLE' || status === 'STORED') {
            line.material.emissive.setHex(0x000000);
            line.material.color.setHex(0x10b981); // Solid green base when active
        } else if (status === 'EMPTY') {
            line.material.emissive.setHex(0x000000);
            line.material.color.setHex(0x2d3748);
        }
    }

    updateCacheLineData(index, text, color = '#e2e8f0') {
        const sprite = this.cacheBlockLabels?.[index];
        if (!sprite) return;
        
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = color;
        ctx.font = 'bold 64px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 256, 64);
        
        const texture = new THREE.CanvasTexture(canvas);
        const oldTexture = sprite.material.map;
        sprite.material.map = texture;
        sprite.material.needsUpdate = true;
        if (oldTexture) oldTexture.dispose();
    }
}
