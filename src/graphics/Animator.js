import { gsap } from 'gsap';

export class Animator {
    constructor(environment) {
        this.env = environment;
        this.block = environment.activeBlock;
    }

    reset() {
        gsap.killTweensOf(this.block);
        this.block.rotation.set(0, 0, 0);
        this.block.scale.set(1, 1, 1);
        this.block.material.opacity = 0;
    }

    // Sequence for a Cache Request
    async animateRequest(blockNumber, cacheIndex, status, isEvicting, evictedBlock) {
        this.reset();

        const cpuPos = this.env.getCPUPos();
        const cachePos = this.env.getCacheLinePos(cacheIndex);
        const memPos = this.env.getMemoryBlockPos(blockNumber);

        this.block.position.copy(cpuPos);
        this.block.material.opacity = 1;
        this.block.material.color.setHex(0xf59e0b);
        this.block.material.emissive.setHex(0xf59e0b);

        const tl = gsap.timeline();

        // Step 1: CPU Request to Cache
        tl.to(this.block.position, {
            x: cachePos.x,
            y: cachePos.y,
            z: cachePos.z,
            duration: 0.6,
            ease: "power2.inOut"
        });
        tl.to(this.block.rotation, { x: "+=3.14", y: "+=3.14", duration: 0.6 }, "<");

        if (status === 'HIT') {
            // Flash Green and Bounce
            tl.call(() => {
                this.env.setCacheLineStatus(cacheIndex, 'HIT');
                this.block.material.color.setHex(0x10b981);
                this.block.material.emissive.setHex(0x10b981);
                const line = this.env.cacheLines[cacheIndex];
                if (line) gsap.to(line.scale, { x: 1.2, y: 1.2, z: 1.2, duration: 0.15, yoyo: true, repeat: 1 });
            });
            tl.to({}, { duration: 0.4 }); // pause

            // Return to CPU
            tl.to(this.block.position, {
                x: cpuPos.x,
                y: cpuPos.y,
                z: cpuPos.z,
                duration: 0.6,
                ease: "power2.inOut"
            });
            tl.call(() => {
                this.env.setCacheLineStatus(cacheIndex, 'STORED');
                this.block.material.opacity = 0;
            });
        } else if (status === 'MISS') {
            // Flash Red and Shake
            tl.call(() => {
                this.env.setCacheLineStatus(cacheIndex, 'MISS');
                this.block.material.color.setHex(0xef4444);
                this.block.material.emissive.setHex(0xef4444);
                const line = this.env.cacheLines[cacheIndex];
                if (line) gsap.to(line.position, { x: "+=0.3", duration: 0.05, yoyo: true, repeat: 5 });
            });
            tl.to({}, { duration: 0.4 });

            // If Evicting, simulate eviction first (optional simplified visual: just flash orange)
            // Go to Memory
            tl.to(this.block.position, {
                x: memPos.x,
                y: memPos.y,
                z: memPos.z,
                duration: 0.8,
                ease: "power2.inOut"
            });

            // Fetch Data
            tl.call(() => {
                this.block.material.color.setHex(0x3b82f6);
                this.block.material.emissive.setHex(0x3b82f6);
            });

            // Return to Cache
            tl.to(this.block.position, {
                x: cachePos.x,
                y: cachePos.y,
                z: cachePos.z,
                duration: 0.8,
                ease: "power2.inOut"
            });
            tl.to(this.block.rotation, { x: "+=6.28", y: "+=6.28", duration: 0.8 }, "<");

            // Update Cache visually
            tl.call(() => {
                this.env.setCacheLineStatus(cacheIndex, 'STORED');
                this.block.material.color.setHex(0x10b981);
                this.block.material.emissive.setHex(0x10b981);
                const line = this.env.cacheLines[cacheIndex];
                if (line) gsap.to(line.scale, { x: 1.2, y: 1.2, z: 1.2, duration: 0.15, yoyo: true, repeat: 1 });
            });

            // Return to CPU
            tl.to(this.block.position, {
                x: cpuPos.x,
                y: cpuPos.y,
                z: cpuPos.z,
                duration: 0.6,
                ease: "power2.inOut"
            });
            tl.call(() => {
                this.block.material.opacity = 0;
            });
        }

        return tl; // Allow awaiting or pausing
    }

    // Sequence for a Direct Memory Store
    async animateStore(blockNumber) {
        this.reset();

        const cpuPos = this.env.getCPUPos();
        const memPos = this.env.getMemoryBlockPos(blockNumber);

        this.block.position.copy(cpuPos);
        this.block.material.opacity = 1;
        this.block.material.color.setHex(0xa78bfa); // CPU color
        this.block.material.emissive.setHex(0xa78bfa);

        const tl = gsap.timeline();

        // Go straight to memory
        tl.to(this.block.position, {
            x: memPos.x,
            y: memPos.y,
            z: memPos.z,
            duration: 1.0,
            ease: "power2.inOut"
        });
        tl.to(this.block.rotation, { x: "+=6.28", y: "+=6.28", duration: 1.0 }, "<");

        // Flash Memory
        tl.call(() => {
            this.block.material.color.setHex(0x22c55e); // Green-ish memory color to show success
            this.block.material.emissive.setHex(0x22c55e);
            const memBlock = this.env.blocks[blockNumber];
            if (memBlock) {
                gsap.to(memBlock.scale, { x: 1.3, y: 1.3, z: 1.3, duration: 0.2, yoyo: true, repeat: 1 });
                const initColor = memBlock.material.color.getHex();
                memBlock.material.color.setHex(0xf59e0b);
                setTimeout(() => memBlock.material.color.setHex(initColor), 400);
            }
        });
        tl.to({}, { duration: 0.5 });

        // Return back
        tl.to(this.block.position, {
            x: cpuPos.x,
            y: cpuPos.y,
            z: cpuPos.z,
            duration: 0.8,
            ease: "power2.inOut"
        });
        tl.call(() => {
            this.block.material.opacity = 0;
        });

        return tl;
    }
}
