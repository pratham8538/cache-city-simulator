export const MAPPING_INFO = {
    'direct': {
        desc: 'Direct Mapping maps each block of main memory into only one possible cache line.',
        adv: 'Simple to implement, fast to check.',
        dis: 'High conflict miss rate if multiple blocks map to the same line.'
    },
    'fully': {
        desc: 'Fully Associative Mapping allows a memory block to be placed in any cache line.',
        adv: 'Lowest conflict miss rate, optimal space utilization.',
        dis: 'Complex and expensive hardware to search all lines simultaneously.'
    },
    'set': {
        desc: 'Set Associative Mapping groups cache lines into sets. A block maps to a specific set, but can be in any line within that set.',
        adv: 'Good compromise between hit rate and hardware complexity.',
        dis: 'More complex than direct, slower than fully associative.'
    }
};

export class UIManager {
    constructor(cacheSystem, onAccessRequest, onResetRequest, onStoreRequest, onHardwareChange) {
        this.cache = cacheSystem;
        this.onAccessRequest = onAccessRequest;
        this.onResetRequest = onResetRequest;
        this.onStoreRequest = onStoreRequest;
        this.onHardwareChange = onHardwareChange;

        // Cache DOM elements
        this.elAddress = document.getElementById('address-input');
        this.lblAddress = document.getElementById('lbl-address');
        this.maxAddress = 255;
        this.btnRequest = document.getElementById('btn-request');
        this.btnStore = document.getElementById('btn-store');
        this.btnReset = document.getElementById('btn-reset');

        this.inpMem = document.getElementById('inp-mem');
        this.inpCache = document.getElementById('inp-cache');
        this.inpBlock = document.getElementById('inp-block');
        this.btnApplyHw = document.getElementById('btn-apply-hw');

        this.selMapping = document.getElementById('sel-mapping');
        this.selPolicy = document.getElementById('sel-policy');

        this.valTag = document.getElementById('val-tag');
        this.valIndex = document.getElementById('val-index');
        this.valOffset = document.getElementById('val-offset');

        this.elMapDesc = document.getElementById('mapping-desc');
        this.elMapAdv = document.getElementById('mapping-adv');
        this.elMapDis = document.getElementById('mapping-dis');

        this.statAccesses = document.getElementById('stat-accesses');
        this.statHits = document.getElementById('stat-hits');
        this.statMisses = document.getElementById('stat-misses');
        this.statRatio = document.getElementById('stat-ratio');

        this.statusText = document.getElementById('status-text');

        const sidePanel = document.querySelector('.side-panel');
        if (sidePanel) {
            const sidePanelHandle = sidePanel.querySelector('h3');
            this.makeDraggable(sidePanel, sidePanelHandle);
        }

        this.bindEvents();
        this.updateMappingExplanation();
    }

    makeDraggable(panel, handle) {
        let isDragging = false;
        let startX, startY, initialLeft, initialTop;

        handle.style.cursor = 'grab';

        handle.addEventListener('mousedown', (e) => {
            isDragging = true;
            handle.style.cursor = 'grabbing';

            const rect = panel.getBoundingClientRect();
            panel.style.top = rect.top + 'px';
            panel.style.left = rect.left + 'px';
            panel.style.transform = 'none';
            panel.style.right = 'auto';

            startX = e.clientX;
            startY = e.clientY;
            initialLeft = rect.left;
            initialTop = rect.top;

            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            panel.style.left = (initialLeft + dx) + 'px';
            panel.style.top = (initialTop + dy) + 'px';
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                handle.style.cursor = 'grab';
            }
        });
    }

    bindEvents() {
        this.btnRequest.addEventListener('click', () => this.handleRequest());
        if (this.btnStore) {
            this.btnStore.addEventListener('click', () => this.handleStore());
        }
        if (this.btnApplyHw) {
            this.btnApplyHw.addEventListener('click', () => {
                const mem = parseInt(this.inpMem.value, 10);
                const cache = parseInt(this.inpCache.value, 10);
                const block = parseInt(this.inpBlock.value, 10);
                if (mem > 0 && cache > 0 && block > 0 && this.onHardwareChange) {
                    this.onHardwareChange(mem, cache, block);
                }
            });
        }

        this.elAddress.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleRequest();
        });

        this.btnReset.addEventListener('click', () => {
            if (this.onResetRequest) this.onResetRequest();
        });

        // Changing mappings clears cache visually
        this.selMapping.addEventListener('change', () => {
            this.updateMappingExplanation();
            if (this.onResetRequest) this.onResetRequest();
        });
        this.selPolicy.addEventListener('change', () => {
            if (this.onResetRequest) this.onResetRequest();
        });
    }

    getMapping() { return this.selMapping.value; }
    getPolicy() { return this.selPolicy.value; }

    updateMappingExplanation() {
        if (!this.elMapDesc) return;
        const info = MAPPING_INFO[this.getMapping()];
        if (info) {
            this.elMapDesc.innerText = info.desc;
            this.elMapAdv.innerText = info.adv;
            this.elMapDis.innerText = info.dis;
        }
    }

    handleStore() {
        const addr = parseInt(this.elAddress.value, 10);
        if (isNaN(addr) || addr < 0 || addr > this.maxAddress) {
            alert(`Please enter a valid address between 0 and ${this.maxAddress}`);
            return;
        }
        if (this.onStoreRequest) {
            this.onStoreRequest(addr, this.getMapping(), this.getPolicy());
        }
    }

    handleRequest() {
        const addr = parseInt(this.elAddress.value, 10);
        if (isNaN(addr) || addr < 0 || addr > this.maxAddress) {
            alert(`Please enter a valid address between 0 and ${this.maxAddress}`);
            return;
        }

        if (this.onAccessRequest) {
            this.onAccessRequest(addr, this.getMapping(), this.getPolicy());
        }
    }

    setMaxAddress(max) {
        this.maxAddress = max;
        if (this.lblAddress) {
            this.lblAddress.innerText = `Address (0-${max})`;
        }
        if (this.elAddress) {
            this.elAddress.setAttribute('max', max);
        }
    }

    updateAddressBreakdown(tag, index, offset) {
        this.valTag.innerText = tag !== '-' ? tag : 'N/A';
        this.valIndex.innerText = index !== '-' ? index : 'N/A';
        this.valOffset.innerText = offset;
    }

    setAddressInput(val) {
        if (this.elAddress) this.elAddress.value = val;
    }

    updateStats(stats) {
        this.statAccesses.innerText = stats.accesses;
        this.statHits.innerText = stats.hits;
        this.statMisses.innerText = stats.misses;

        const ratio = stats.accesses > 0 ? ((stats.hits / stats.accesses) * 100).toFixed(1) : 0;
        this.statRatio.innerText = ratio + '%';
    }

    updateStatusData(statusDesc, isHit) {
        this.statusText.innerText = statusDesc;
        this.statusText.className = 'status ' + (isHit ? 'hit' : 'miss');
    }

    setStatus(text, type = 'idle') {
        this.statusText.innerText = text;
        this.statusText.className = 'status ' + type;
    }
}
