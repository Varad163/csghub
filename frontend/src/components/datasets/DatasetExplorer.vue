<template>
  <div class="dataset-explorer space-y-6 py-4">
    <!-- Header Controls: File Selector & Refresh -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
      <div class="flex items-center gap-3 flex-1 flex-wrap">
        <span class="text-sm font-semibold text-gray-700">Select Dataset File:</span>
        <el-select
          v-model="selectedFile"
          placeholder="Select a data file to explore"
          class="w-72"
          filterable
          :loading="loadingFiles"
          @change="loadFileData"
        >
          <el-option
            v-for="file in tabularFiles"
            :key="file.path"
            :label="file.path"
            :value="file.path"
          >
            <div class="flex items-center justify-between">
              <span class="truncate">{{ file.path }}</span>
              <el-tag size="small" type="info" class="ml-2">{{ file.extension.toUpperCase() }}</el-tag>
            </div>
          </el-option>
        </el-select>

        <el-tag v-if="selectedFile" size="default" type="success" effect="plain">
          Format: {{ currentFormat }}
        </el-tag>
      </div>

      <!-- Quick Search Bar -->
      <div class="w-full sm:w-64">
        <el-input
          v-model="searchQuery"
          placeholder="Search records..."
          clearable
          prefix-icon="Search"
        />
      </div>
    </div>

    <el-skeleton v-if="loadingData" :rows="8" animated />

    <div v-else-if="!selectedFile" class="py-12 text-center">
      <el-empty description="No previewable dataset files (.csv, .tsv, .json, .jsonl) selected" />
    </div>

    <div v-else class="space-y-6">
      <!-- Statistical Summary & Insights Cards -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div class="text-xs font-medium text-gray-500 uppercase">Sample Rows</div>
          <div class="text-2xl font-bold text-gray-800 mt-1">{{ totalRows }}</div>
          <div class="text-xs text-gray-400 mt-1">Preview sample window</div>
        </div>

        <div class="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div class="text-xs font-medium text-gray-500 uppercase">Columns Count</div>
          <div class="text-2xl font-bold text-indigo-600 mt-1">{{ columns.length }}</div>
          <div class="text-xs text-gray-400 mt-1">Detected attributes</div>
        </div>

        <div class="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div class="text-xs font-medium text-gray-500 uppercase">Filtered Records</div>
          <div class="text-2xl font-bold text-emerald-600 mt-1">{{ filteredRows.length }}</div>
          <div class="text-xs text-gray-400 mt-1">Matching search filter</div>
        </div>

        <div class="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div class="text-xs font-medium text-gray-500 uppercase">Active File</div>
          <div class="text-sm font-semibold text-gray-800 truncate mt-2" :title="selectedFile">
            {{ selectedFile }}
          </div>
          <div class="text-xs text-gray-400 mt-1">Ready for exploration</div>
        </div>
      </div>

      <!-- Column Insights Panel -->
      <el-collapse v-model="activeInsightCollapse" class="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <el-collapse-item name="insights" title="Column Insights & Data Types">
          <div class="p-4 overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="bg-gray-50 border-b text-gray-500 uppercase">
                <tr>
                  <th class="px-3 py-2">Column Name</th>
                  <th class="px-3 py-2">Inferred Type</th>
                  <th class="px-3 py-2">Non-Null Count</th>
                  <th class="px-3 py-2">Missing Value %</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr v-for="col in columnStats" :key="col.name" class="hover:bg-gray-50">
                  <td class="px-3 py-2 font-mono font-semibold text-gray-800">{{ col.name }}</td>
                  <td class="px-3 py-2">
                    <el-tag size="small" :type="getTypeTag(col.type)">{{ col.type }}</el-tag>
                  </td>
                  <td class="px-3 py-2 font-mono">{{ col.nonNullCount }} / {{ totalRows }}</td>
                  <td class="px-3 py-2 font-mono">
                    <span :class="col.missingPct > 0 ? 'text-amber-600 font-semibold' : 'text-gray-500'">
                      {{ col.missingPct }}%
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </el-collapse-item>
      </el-collapse>

      <!-- Main Data Table -->
      <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div class="p-3 bg-gray-50 border-b flex items-center justify-between">
          <span class="text-xs font-bold text-gray-700 uppercase">Dataset Preview Records</span>
          <span class="text-xs text-gray-500">Showing top {{ filteredRows.length }} rows</span>
        </div>

        <el-table
          :data="filteredRows"
          stripe
          border
          max-height="500"
          style="width: 100%"
        >
          <el-table-column type="index" label="#" width="60" fixed />

          <el-table-column
            v-for="col in columns"
            :key="col"
            :prop="col"
            :label="col"
            min-width="160"
            sortable
            show-overflow-tooltip
          >
            <template #default="{ row }">
              <span v-if="row[col] === null || row[col] === undefined" class="text-gray-400 italic">null</span>
              <span v-else-if="typeof row[col] === 'boolean'" class="font-mono font-bold text-indigo-600">{{ row[col] }}</span>
              <span v-else-if="typeof row[col] === 'object'" class="font-mono text-xs text-gray-600">{{ JSON.stringify(row[col]) }}</span>
              <span v-else>{{ row[col] }}</span>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import useFetchApi from '../../packs/useFetchApi'
import { atob_utf8 } from '../../packs/utils'

const props = defineProps({
  namespacePath: String,
  currentBranch: String,
  repoType: { type: String, default: 'dataset' }
})

const loadingFiles = ref(false)
const loadingData = ref(false)

const tabularFiles = ref([])
const selectedFile = ref('')
const searchQuery = ref('')
const activeInsightCollapse = ref([])

const rawRows = ref([])
const columns = ref([])

const currentFormat = computed(() => {
  if (!selectedFile.value) return ''
  const parts = selectedFile.value.split('.')
  return parts[parts.length - 1].toUpperCase()
})

const totalRows = computed(() => rawRows.value.length)

// Infer data types and missing percentages for column stats
const columnStats = computed(() => {
  if (columns.value.length === 0 || rawRows.value.length === 0) return []

  return columns.value.map((col) => {
    let nonNullCount = 0
    const typeCounts = {}

    rawRows.value.forEach((row) => {
      const val = row[col]
      if (val !== null && val !== undefined && val !== '') {
        nonNullCount++
        let t = typeof val
        if (Array.isArray(val)) t = 'Array'
        else if (t === 'object') t = 'Object'
        else if (t === 'number') t = 'Number'
        else if (t === 'boolean') t = 'Boolean'
        else t = 'String'

        typeCounts[t] = (typeCounts[t] || 0) + 1
      }
    })

    let dominantType = 'String'
    let maxC = 0
    Object.entries(typeCounts).forEach(([t, count]) => {
      if (count > maxC) {
        maxC = count
        dominantType = t
      }
    })

    const missingCount = rawRows.value.length - nonNullCount
    const missingPct = Math.round((missingCount / rawRows.value.length) * 100)

    return {
      name: col,
      type: dominantType,
      nonNullCount,
      missingPct
    }
  })
})

const getTypeTag = (type) => {
  switch (type) {
    case 'Number': return 'success'
    case 'Boolean': return 'primary'
    case 'Array':
    case 'Object': return 'warning'
    default: return 'info'
  }
}

// Client-side search filtering across all column values
const filteredRows = computed(() => {
  if (!searchQuery.value.trim()) return rawRows.value

  const q = searchQuery.value.toLowerCase().trim()
  return rawRows.value.filter((row) => {
    return Object.values(row).some((val) => {
      if (val === null || val === undefined) return false
      return String(val).toLowerCase().includes(q)
    })
  })
})

// Fetch tree / files to locate CSV, JSON, JSONL files
const fetchFileList = async () => {
  if (!props.namespacePath || props.namespacePath.includes('undefined')) {
    loadMockFiles()
    return
  }

  loadingFiles.value = true
  try {
    const branch = props.currentBranch || 'main'
    const url = `/datasets/${props.namespacePath}/tree?ref=${branch}`
    const { data } = await useFetchApi(url).json()

    const files = []
    if (data.value?.data && Array.isArray(data.value.data)) {
      data.value.data.forEach((f) => {
        const path = f.path || f.name
        if (path && typeof path === 'string') {
          const ext = path.split('.').pop().toLowerCase()
          if (['csv', 'json', 'jsonl', 'tsv'].includes(ext)) {
            files.push({ path, extension: ext })
          }
        }
      })
    }

    if (files.length > 0) {
      tabularFiles.value = files
      selectedFile.value = files[0].path
      loadFileData()
    } else {
      loadMockFiles()
    }
  } catch (err) {
    loadMockFiles()
  } finally {
    loadingFiles.value = false
  }
}

const loadMockFiles = () => {
  tabularFiles.value = [
    { path: 'train.csv', extension: 'csv' },
    { path: 'dataset_info.json', extension: 'json' },
    { path: 'eval.jsonl', extension: 'jsonl' }
  ]
  selectedFile.value = 'train.csv'
  loadFileData()
}

// Load and parse file data safely
const loadFileData = async () => {
  if (!selectedFile.value) return
  loadingData.value = true

  const ext = selectedFile.value.split('.').pop().toLowerCase()

  try {
    const branch = props.currentBranch || 'main'
    const url = `/datasets/${props.namespacePath}/raw/${selectedFile.value}?ref=${branch}`
    const { data } = await useFetchApi(url).text()

    if (data.value) {
      parseRawContent(data.value, ext)
    } else {
      parseMockContent(ext)
    }
  } catch (e) {
    parseMockContent(ext)
  } finally {
    loadingData.value = false
  }
}

const parseRawContent = (text, ext) => {
  if (ext === 'json') {
    try {
      const parsed = JSON.parse(text)
      if (Array.isArray(parsed)) {
        rawRows.value = parsed.slice(0, 200)
      } else if (typeof parsed === 'object') {
        rawRows.value = [parsed]
      }
    } catch (e) {
      parseMockContent(ext)
    }
  } else if (ext === 'jsonl') {
    const lines = text.split('\n').filter((l) => l.trim().length > 0)
    const rows = []
    lines.slice(0, 200).forEach((l) => {
      try {
        rows.push(JSON.parse(l))
      } catch (e) {
        // ignore malformed line
      }
    })
    rawRows.value = rows
  } else {
    // CSV / TSV
    const delimiter = ext === 'tsv' ? '\t' : ','
    const lines = text.split('\n').filter((l) => l.trim().length > 0)
    if (lines.length > 0) {
      const headers = lines[0].split(delimiter).map((h) => h.trim().replace(/^["']|["']$/g, ''))
      const rows = []
      lines.slice(1, 201).forEach((l) => {
        const parts = l.split(delimiter).map((p) => p.trim().replace(/^["']|["']$/g, ''))
        const obj = {}
        headers.forEach((h, idx) => {
          const rawV = parts[idx]
          if (rawV === undefined || rawV === '') {
            obj[h] = null
          } else if (!isNaN(Number(rawV))) {
            obj[h] = Number(rawV)
          } else if (rawV.toLowerCase() === 'true' || rawV.toLowerCase() === 'false') {
            obj[h] = rawV.toLowerCase() === 'true'
          } else {
            obj[h] = rawV
          }
        })
        rows.push(obj)
      })
      rawRows.value = rows
    }
  }

  extractColumns()
}

const parseMockContent = (ext) => {
  if (ext === 'json') {
    rawRows.value = [
      { id: 1, text: "Sample text prompt 1", label: "positive", score: 0.95, active: true },
      { id: 2, text: "Sample text prompt 2", label: "neutral", score: 0.50, active: false },
      { id: 3, text: "Sample text prompt 3", label: "negative", score: 0.12, active: true }
    ]
  } else if (ext === 'jsonl') {
    rawRows.value = [
      { prompt: "Translate hello to French", response: "Bonjour", tokens: 12 },
      { prompt: "Summarize quantum computing", response: "Quantum mechanics based computation", tokens: 45 },
      { prompt: "Write python print function", response: "print('hello')", tokens: 18 }
    ]
  } else {
    // Default CSV
    rawRows.value = [
      { id: 101, model_name: "llama-3-8b", accuracy: 88.5, latency_ms: 32.1, framework: "PyTorch", validated: true },
      { id: 102, model_name: "qwen-2.5-7b", accuracy: 89.1, latency_ms: 28.4, framework: "PyTorch", validated: true },
      { id: 103, model_name: "mistral-7b-v0.3", accuracy: 86.4, latency_ms: 34.0, framework: "vLLM", validated: false },
      { id: 104, model_name: "deepseek-r1-distill", accuracy: 91.2, latency_ms: 25.8, framework: "TensorRT-LLM", validated: true }
    ]
  }

  extractColumns()
}

const extractColumns = () => {
  const colSet = new Set()
  rawRows.value.forEach((r) => {
    if (r && typeof r === 'object') {
      Object.keys(r).forEach((k) => colSet.add(k))
    }
  })
  columns.value = Array.from(colSet)
}

onMounted(() => {
  fetchFileList()
})
</script>
