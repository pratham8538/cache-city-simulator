export class CacheSystem {
    constructor(memoryBlocks = 64, cacheLines = 8, blockSize = 4, sets = 4) {
        this.memoryBlocks = memoryBlocks;
        this.cacheLines = cacheLines;
        this.blockSize = blockSize;
        this.sets = sets;
        this.linesPerSet = cacheLines / sets; // e.g. 8 lines / 4 sets = 2-way
        
        this.stats = { hits: 0, misses: 0, accesses: 0 };
        this.timer = 0; 
        
        this.resetCache();
    }
    
    resetCache() {
        this.cache = Array(this.cacheLines).fill(null).map(() => ({
            valid: false, 
            tag: -1, 
            lastAccess: 0, 
            insertionTime: 0, 
            frequency: 0, 
            blockIndex: -1
        }));
        this.stats = { hits: 0, misses: 0, accesses: 0 };
        this.timer = 0;
    }
    
    requestAddress(address, mode, policy) {
        this.timer++;
        const blockNumber = Math.floor(address / this.blockSize);
        const offset = address % this.blockSize;
        
        if (blockNumber >= this.memoryBlocks) {
            return { error: 'Address out of bounds' };
        }
        
        let index, tag, setIndex;
        let startIndex, endIndex;
        
        if (mode === 'direct') {
            index = blockNumber % this.cacheLines;
            tag = Math.floor(blockNumber / this.cacheLines);
            startIndex = index;
            endIndex = index + 1;
        } else if (mode === 'fully') {
            index = '-';
            tag = blockNumber;
            startIndex = 0;
            endIndex = this.cacheLines;
        } else if (mode === 'set') {
            setIndex = blockNumber % this.sets;
            tag = Math.floor(blockNumber / this.sets);
            startIndex = setIndex * this.linesPerSet;
            endIndex = startIndex + this.linesPerSet;
            index = setIndex;
        }
        
        this.stats.accesses++;
        
        // lookup
        let hitLine = -1;
        for (let i = startIndex; i < endIndex; i++) {
            if (this.cache[i].valid && this.cache[i].tag === tag) {
                hitLine = i;
                break;
            }
        }
        
        if (hitLine !== -1) {
            // HIT
            this.stats.hits++;
            this.cache[hitLine].lastAccess = this.timer;
            this.cache[hitLine].frequency++;
            return {
                status: 'HIT',
                lineIndex: hitLine,
                blockNumber,
                tag,
                index,
                offset,
                evicted: false,
                evictedBlock: -1
            };
        } else {
            // MISS
            this.stats.misses++;
            let replaceLine = Math.floor(this.findReplacementLine(startIndex, endIndex, policy));
            let evictedBlock = this.cache[replaceLine].valid ? this.cache[replaceLine].blockIndex : -1;
            
            this.cache[replaceLine] = {
                valid: true,
                tag,
                lastAccess: this.timer,
                insertionTime: this.timer,
                frequency: 1,
                blockIndex: blockNumber
            };
            
            return {
                status: 'MISS',
                lineIndex: replaceLine,
                blockNumber,
                tag,
                index,
                offset,
                evicted: evictedBlock !== -1,
                evictedBlock
            };
        }
    }
    
    findReplacementLine(start, end, policy) {
        // Find first empty
        for (let i = start; i < end; i++) {
            if (!this.cache[i].valid) return i;
        }
        
        // Evict based on policy
        let candidate = start;
        for (let i = start + 1; i < end; i++) {
            if (policy === 'lru') {
                if (this.cache[i].lastAccess < this.cache[candidate].lastAccess) candidate = i;
            } else if (policy === 'fifo') {
                if (this.cache[i].insertionTime < this.cache[candidate].insertionTime) candidate = i;
            } else if (policy === 'lfu') {
                if (this.cache[i].frequency < this.cache[candidate].frequency) candidate = i;
                else if (this.cache[i].frequency === this.cache[candidate].frequency) {
                    if (this.cache[i].lastAccess < this.cache[candidate].lastAccess) candidate = i;
                }
            }
        }
        return candidate;
    }
}
