import { SceneManager } from './graphics/SceneManager.js';
import { Environment } from './graphics/Environment.js';
import { Animator } from './graphics/Animator.js';
import { CacheSystem } from './simulation/CacheSystem.js';
import { UIManager } from './ui/UIManager.js';

let sceneManager, environment, animator, cacheSystem, uiManager;
let isAnimating = false;

function init() {
    // Math note: 64 blocks of 4 words each = 256 words (addresses 0-255).
    // Cache: 8 lines, sets: 4
    cacheSystem = new CacheSystem(64, 8, 4, 4);

    sceneManager = new SceneManager('canvas-container');
    environment = new Environment(sceneManager, 8, 64);
    animator = new Animator(environment);

    uiManager = new UIManager(cacheSystem, handleAccessRequest, handleResetRequest, handleStoreRequest, handleHardwareChange);
    uiManager.updateStats(cacheSystem.stats);
    uiManager.setMaxAddress((64 * 4) - 1); // 255 default max

    setupInteractivity();

    renderLoop();
}

function setupInteractivity() {
    window.addEventListener('pointerdown', (event) => {
        const mouse = {
            x: (event.clientX / window.innerWidth) * 2 - 1,
            y: -(event.clientY / window.innerHeight) * 2 + 1
        };
        const raycaster = sceneManager.getRaycaster(mouse);
        const intersects = raycaster.intersectObjects(sceneManager.scene.children, true);

        for (let i = 0; i < intersects.length; i++) {
            const obj = intersects[i].object;
            // Check if it's a memory block by finding it in environment.blocks
            for (const key in environment.blocks) {
                if (environment.blocks[key] === obj) {
                    const blockIndex = parseInt(key, 10);
                    const baseAddress = blockIndex * cacheSystem.blockSize;
                    uiManager.setAddressInput(baseAddress);

                    // Flash it to show interaction
                    const initColor = obj.material.color.getHex();
                    obj.material.color.setHex(0xf59e0b);
                    setTimeout(() => { if (obj.material) obj.material.color.setHex(initColor); }, 200);
                    return;
                }
            }
        }
    });
}

async function handleAccessRequest(address, mapping, policy) {
    if (isAnimating) return; // Wait for current animation to finish
    isAnimating = true;

    uiManager.setStatus('Processing...', 'idle');

    const result = cacheSystem.requestAddress(address, mapping, policy);

    if (result.error) {
        uiManager.setStatus('Error: ' + result.error, 'miss');
        isAnimating = false;
        return;
    }

    uiManager.updateAddressBreakdown(result.tag, result.index, result.offset);

    const animTimeline = animator.animateRequest(
        result.blockNumber,
        result.lineIndex,
        result.status,
        result.evicted,
        result.evictedBlock
    );

    await animTimeline; // wait for gsap timeline

    uiManager.updateStats(cacheSystem.stats);
    uiManager.updateStatusData(
        result.status === 'HIT' ? `HIT: Line ${result.lineIndex}` : `MISS: Fetched to Line ${result.lineIndex}`,
        result.status === 'HIT'
    );

    // Update the visual text label showing what is stored
    environment.updateCacheLineData(result.lineIndex, 'M:' + result.blockNumber, '#00f3ff');

    isAnimating = false;
}

async function handleStoreRequest(address, mapping, policy) {
    if (isAnimating) return;
    isAnimating = true;

    uiManager.setStatus('Storing straight to Main Memory...', 'idle');

    const blockNumber = Math.floor(address / cacheSystem.blockSize);

    if (blockNumber >= cacheSystem.memoryBlocks) {
        uiManager.setStatus('Error: Address out of bounds', 'miss');
        isAnimating = false;
        return;
    }

    // Compute breakdown for visual
    let tag = '-', index = '-', offset = address % cacheSystem.blockSize;
    if (mapping === 'direct') {
        index = blockNumber % cacheSystem.cacheLines;
        tag = Math.floor(blockNumber / cacheSystem.cacheLines);
    } else if (mapping === 'fully') {
        tag = blockNumber;
    } else if (mapping === 'set') {
        index = blockNumber % cacheSystem.sets;
        tag = Math.floor(blockNumber / cacheSystem.sets);
    }

    uiManager.updateAddressBreakdown(tag, index, offset);

    const animTimeline = animator.animateStore(blockNumber);
    await animTimeline;

    uiManager.updateStatusData(`STORED directly in Mem Block ${blockNumber}`, true);
    isAnimating = false;
}

function handleResetRequest() {
    if (isAnimating) {
        animator.reset();
        isAnimating = false;
    }

    cacheSystem.resetCache();

    // Safety check in case cacheLinesCount changed
    for (let i = 0; i < environment.cacheLinesCount; i++) {
        environment.setCacheLineStatus(i, 'EMPTY');
        environment.updateCacheLineData(i, 'EMPTY', '#e2e8f0');
    }

    uiManager.updateStats(cacheSystem.stats);
    uiManager.updateAddressBreakdown('-', '-', '-');
    uiManager.setStatus('IDLE', 'idle');
}

function handleHardwareChange(mBlocks, cLines, bSize) {
    if (isAnimating) return;

    // Fixed 2-way set associative logic for sets
    const sets = Math.floor(cLines / 2) || 1;

    environment.clearScene();

    cacheSystem = new CacheSystem(mBlocks, cLines, bSize, sets);
    environment = new Environment(sceneManager, cLines, mBlocks);
    animator = new Animator(environment);

    uiManager.cache = cacheSystem;
    uiManager.setMaxAddress((mBlocks * bSize) - 1);
    uiManager.updateStats(cacheSystem.stats);
    uiManager.updateAddressBreakdown('-', '-', '-');
    uiManager.setStatus('Hardware configuration applied.', 'idle');
}

function renderLoop() {
    requestAnimationFrame(renderLoop);
    sceneManager.update();
}

window.onload = init;
