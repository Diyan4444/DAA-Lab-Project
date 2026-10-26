/**
 * Smart Exam Scheduler - Deterministic Huffman Encoding Module
 * 
 * Compresses student enrollments using subject frequencies and a custom binary min-heap.
 * Provides full deterministic encoding, bit packing, and loss-free round-trip decompression.
 * 
 * STRICT: Pure logic, zero DOM dependencies.
 */

(function (global) {
  'use strict';

  /**
   * Hand-written Binary Min-Heap for Huffman Nodes.
   * Order:
   * 1. Lower frequency first
   * 2. Ties broken by smaller lowest symbol ID in the subtree
   */
  class MinHeap {
    constructor() {
      this.heap = [];
    }

    get size() {
      return this.heap.length;
    }

    compare(a, b) {
      if (a.freq !== b.freq) {
        return a.freq - b.freq;
      }
      return a.minSymbolId - b.minSymbolId;
    }

    push(node) {
      this.heap.push(node);
      this.siftUp(this.heap.length - 1);
    }

    pop() {
      if (this.heap.length === 0) return null;
      if (this.heap.length === 1) return this.heap.pop();
      const top = this.heap[0];
      this.heap[0] = this.heap.pop();
      this.siftDown(0);
      return top;
    }

    siftUp(index) {
      let current = index;
      while (current > 0) {
        const parent = Math.floor((current - 1) / 2);
        if (this.compare(this.heap[current], this.heap[parent]) < 0) {
          const temp = this.heap[current];
          this.heap[current] = this.heap[parent];
          this.heap[parent] = temp;
          current = parent;
        } else {
          break;
        }
      }
    }

    siftDown(index) {
      let current = index;
      const len = this.heap.length;
      while (current * 2 + 1 < len) {
        let left = current * 2 + 1;
        let right = current * 2 + 2;
        let best = left;

        if (right < len && this.compare(this.heap[right], this.heap[left]) < 0) {
          best = right;
        }

        if (this.compare(this.heap[best], this.heap[current]) < 0) {
          const temp = this.heap[current];
          this.heap[current] = this.heap[best];
          this.heap[best] = temp;
          current = best;
        } else {
          break;
        }
      }
    }
  }

  /**
   * Build Huffman Tree from an array/map of frequencies by symbol ID.
   * 
   * @param {number[]|Object} freqById 
   * @returns {Object|null} Root of Huffman tree
   */
  function buildHuffmanTree(freqById) {
    const heap = new MinHeap();
    const ids = Array.isArray(freqById)
      ? Array.from({ length: freqById.length }, (_, i) => i)
      : Object.keys(freqById).map(Number);

    for (const id of ids) {
      const freq = freqById[id] || 0;
      if (freq > 0) {
        heap.push({
          symbolId: id,
          freq,
          minSymbolId: id,
          left: null,
          right: null
        });
      }
    }

    if (heap.size === 0) return null;
    if (heap.size === 1) {
      const single = heap.pop();
      return single;
    }

    while (heap.size > 1) {
      const left = heap.pop();  // bit '0'
      const right = heap.pop(); // bit '1'

      const parent = {
        symbolId: null,
        freq: left.freq + right.freq,
        minSymbolId: Math.min(left.minSymbolId, right.minSymbolId),
        left,
        right
      };
      heap.push(parent);
    }

    return heap.pop();
  }

  /**
   * Assign prefix-free binary codes to all leaf symbols.
   * 
   * @param {Object} root 
   * @returns {Object} Map of symbolId -> bit string ('0' and '1')
   */
  function assignCodes(root) {
    const codes = {};
    if (!root) return codes;

    if (root.symbolId !== null && !root.left && !root.right) {
      // Single symbol tree
      codes[root.symbolId] = '0';
      return codes;
    }

    function dfs(node, path) {
      if (!node) return;
      if (node.symbolId !== null && !node.left && !node.right) {
        codes[node.symbolId] = path;
        return;
      }
      if (node.left) dfs(node.left, path + '0');
      if (node.right) dfs(node.right, path + '1');
    }

    dfs(root, '');
    return codes;
  }

  /**
   * Encode students array into a concatenated bit string.
   */
  function encodeEnrollments(students, subjectIdMap, codes, endId) {
    let bitString = '';
    const endCode = codes[endId];

    for (let i = 0; i < students.length; i++) {
      const subjs = students[i].subjects;
      for (let j = 0; j < subjs.length; j++) {
        const id = subjectIdMap[subjs[j]];
        bitString += codes[id];
      }
      bitString += endCode;
    }

    return bitString;
  }

  /**
   * Decode bit string back into subject lists for each student.
   */
  function decodeBits(bitString, root, subjectNamesById, endId) {
    const studentLists = [];
    if (!root || !bitString) return studentLists;

    // Single symbol edge case
    if (root.symbolId !== null && !root.left && !root.right) {
      let current = [];
      for (let i = 0; i < bitString.length; i++) {
        if (root.symbolId === endId) {
          studentLists.push(current);
          current = [];
        } else {
          current.push(subjectNamesById[root.symbolId]);
        }
      }
      return studentLists;
    }

    let current = [];
    let currNode = root;

    for (let i = 0; i < bitString.length; i++) {
      currNode = bitString[i] === '0' ? currNode.left : currNode.right;
      if (!currNode) {
        throw new Error(`Corrupted bit stream at bit index ${i}`);
      }

      if (currNode.symbolId !== null && !currNode.left && !currNode.right) {
        if (currNode.symbolId === endId) {
          studentLists.push(current);
          current = [];
        } else {
          current.push(subjectNamesById[currNode.symbolId]);
        }
        currNode = root;
      }
    }

    return studentLists;
  }

  /**
   * Pack bit string into Uint8Array (MSB first, padded with 0s).
   */
  function packBits(bitString) {
    const byteLength = Math.ceil(bitString.length / 8);
    const bytes = new Uint8Array(byteLength);

    for (let i = 0; i < bitString.length; i++) {
      if (bitString[i] === '1') {
        const byteIndex = Math.floor(i / 8);
        const bitOffset = 7 - (i % 8);
        bytes[byteIndex] |= (1 << bitOffset);
      }
    }

    return bytes;
  }

  /**
   * Unpack Uint8Array back to bit string of exact bitLength.
   */
  function unpackBits(bytes, bitLength) {
    let bitString = '';
    for (let i = 0; i < bitLength; i++) {
      const byteIndex = Math.floor(i / 8);
      const bitOffset = 7 - (i % 8);
      const bit = (bytes[byteIndex] >> bitOffset) & 1;
      bitString += bit ? '1' : '0';
    }
    return bitString;
  }

  /**
   * Full compression workflow for enrollment records.
   */
  function compressEnrollments(students) {
    if (!students || students.length === 0) {
      return null;
    }

    // Collect all distinct subjects, sorted alphabetically for determinism
    const subjectSet = new Set();
    for (const st of students) {
      for (const s of st.subjects) {
        subjectSet.add(s);
      }
    }
    const subjectNames = Array.from(subjectSet).sort();
    const V = subjectNames.length;
    const END_ID = V;

    const subjectIdMap = {};
    for (let i = 0; i < V; i++) {
      subjectIdMap[subjectNames[i]] = i;
    }

    // Frequency by symbol ID
    const freqById = new Array(V + 1).fill(0);
    for (const st of students) {
      for (const s of st.subjects) {
        freqById[subjectIdMap[s]]++;
      }
      freqById[END_ID]++; // END frequency = number of students
    }

    const root = buildHuffmanTree(freqById);
    const codes = assignCodes(root);

    const bitString = encodeEnrollments(students, subjectIdMap, codes, END_ID);
    const bitLength = bitString.length;
    const bytes = packBits(bitString);

    const totalSymbols = students.reduce((sum, st) => sum + st.subjects.length + 1, 0);
    const fixedBitsPerSymbol = Math.max(1, Math.ceil(Math.log2(V + 1)));
    const fixedBitLength = fixedBitsPerSymbol * totalSymbols;
    const savedBits = fixedBitLength - bitLength;
    const savedPercent = fixedBitLength > 0 ? (savedBits / fixedBitLength) * 100 : 0;

    const studentIds = students.map(st => st.id);

    return {
      subjectNames,
      freqById,
      codes,
      bitLength,
      fixedBitsPerSymbol,
      fixedBitLength,
      savedBits,
      savedPercent,
      bytes,
      studentIds,
      root,
      endId: END_ID
    };
  }

  /**
   * Decompress packed data back to student records and verify round-trip.
   */
  function decompressEnrollments(packed) {
    const bitString = unpackBits(packed.bytes, packed.bitLength);
    const decodedLists = decodeBits(bitString, packed.root, packed.subjectNames, packed.endId);

    const students = decodedLists.map((subjs, idx) => ({
      id: packed.studentIds[idx] || `S${idx + 1}`,
      subjects: subjs
    }));

    return students;
  }

  /**
   * Safe chunked Base64 encoding for Uint8Array.
   */
  function bytesToBase64(uint8Arr) {
    if (!uint8Arr) return '';
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < uint8Arr.length; i += chunkSize) {
      const chunk = uint8Arr.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, chunk);
    }
    return btoa(binary);
  }

  /**
   * Build downloadable JSON export object.
   */
  function buildDownloadObject(result) {
    return {
      format: 'huffman-v1',
      subjects: result.subjectNames,
      codes: result.codes,
      studentIds: result.studentIds,
      bitLength: result.bitLength,
      dataBase64: bytesToBase64(result.bytes)
    };
  }

  const HuffmanModule = {
    MinHeap,
    buildHuffmanTree,
    assignCodes,
    encodeEnrollments,
    decodeBits,
    packBits,
    unpackBits,
    compressEnrollments,
    decompressEnrollments,
    buildDownloadObject,
    bytesToBase64
  };

  global.HuffmanModule = HuffmanModule;

})(typeof window !== 'undefined' ? window : globalThis);
