<template>
  <el-dialog
    v-model="dialogVisible"
    title="Model Version Comparison"
    width="90%"
    top="5vh"
    custom-class="compare-versions-dialog"
    destroy-on-close
    :before-close="handleClose"
  >
    <!-- Modal Header bar with selection and actions -->
    <div class="space-y-4 mb-6">
      <div class="flex items-center justify-between flex-wrap gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
        <!-- Version Selectors -->
        <div class="flex items-center flex-wrap gap-4 flex-1 min-w-[300px]">
          <div class="flex items-center gap-2">
            <span class="text-sm font-semibold text-gray-700">Baseline (Version A):</span>
            <el-select
              v-model="versionA"
              placeholder="Select Baseline Version"
              class="w-60"
              filterable
              :loading="loadingOptions"
              @change="handleVersionChange"
            >
              <el-option
                v-for="opt in versionOptions"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              >
                <div class="flex items-center justify-between">
                  <span>{{ opt.value }}</span>
                  <el-tag size="small" :type="opt.type === 'tag' ? 'success' : opt.type === 'branch' ? 'primary' : 'info'">
                    {{ opt.type }}
                  </el-tag>
                </div>
              </el-option>
            </el-select>
          </div>

          <span class="text-gray-400 font-bold text-lg hidden sm:inline">VS</span>

          <div class="flex items-center gap-2">
            <span class="text-sm font-semibold text-gray-700">Target (Version B):</span>
            <el-select
              v-model="versionB"
              placeholder="Select Target Version"
              class="w-60"
              filterable
              :loading="loadingOptions"
              @change="handleVersionChange"
            >
              <el-option
                v-for="opt in versionOptions"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              >
                <div class="flex items-center justify-between">
                  <span>{{ opt.value }}</span>
                  <el-tag size="small" :type="opt.type === 'tag' ? 'success' : opt.type === 'branch' ? 'primary' : 'info'">
                    {{ opt.type }}
                  </el-tag>
                </div>
              </el-option>
            </el-select>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center gap-3">
          <CsgButton
            class="btn btn-secondary-gray btn-sm"
            name="Export Report"
            svgName="download"
            :disabled="loadingData || !versionA || !versionB"
            @click="exportReport"
          />
          <CsgButton
            class="btn btn-primary btn-sm"
            name="Refresh Data"
            :loading="loadingData"
            @click="fetchComparisonData"
          />
        </div>
      </div>

      <!-- Warning for same version selection -->
      <el-alert
        v-if="versionA && versionB && versionA === versionB"
        type="info"
        :closable="false"
        show-icon
        title="Same version selected for both Baseline and Target. Select different versions to see differences."
      />
    </div>

    <!-- Side-by-side Version Context Header Card -->
    <div v-if="!loadingData && (dataA || dataB)" class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      <!-- Version A Metadata Card -->
      <div class="p-4 rounded-lg border border-indigo-200 bg-indigo-50/40">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-bold text-indigo-900 uppercase tracking-wide">Version A (Baseline)</span>
          <el-tag size="small" type="primary">{{ versionA }}</el-tag>
        </div>
        <div class="text-xs space-y-1 text-gray-700 font-mono">
          <div><span class="text-gray-500 font-sans">Commit:</span> {{ dataA.commitId?.substring(0, 8) || 'N/A' }}</div>
          <div><span class="text-gray-500 font-sans">Author:</span> {{ dataA.author || 'N/A' }}</div>
          <div><span class="text-gray-500 font-sans">Date:</span> {{ dataA.date || 'N/A' }}</div>
          <div class="truncate text-gray-600 font-sans mt-1" :title="dataA.message">
            <span class="text-gray-500">Message:</span> {{ dataA.message || 'No commit message' }}
          </div>
        </div>
      </div>

      <!-- Version B Metadata Card -->
      <div class="p-4 rounded-lg border border-emerald-200 bg-emerald-50/40">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-bold text-emerald-900 uppercase tracking-wide">Version B (Target)</span>
          <el-tag size="small" type="success">{{ versionB }}</el-tag>
        </div>
        <div class="text-xs space-y-1 text-gray-700 font-mono">
          <div><span class="text-gray-500 font-sans">Commit:</span> {{ dataB.commitId?.substring(0, 8) || 'N/A' }}</div>
          <div><span class="text-gray-500 font-sans">Author:</span> {{ dataB.author || 'N/A' }}</div>
          <div><span class="text-gray-500 font-sans">Date:</span> {{ dataB.date || 'N/A' }}</div>
          <div class="truncate text-gray-600 font-sans mt-1" :title="dataB.message">
            <span class="text-gray-500">Message:</span> {{ dataB.message || 'No commit message' }}
          </div>
        </div>
      </div>
    </div>

    <!-- Comparison Main Tabs -->
    <el-tabs v-model="activeTab" class="compare-tabs">
      <!-- Parameters / Config Tab -->
      <el-tab-pane label="Configuration & Parameters" name="config">
        <ConfigDiffViewer
          :configA="dataA.config"
          :configB="dataB.config"
          :loading="loadingData"
        />
      </el-tab-pane>

      <!-- README / Model Card Tab -->
      <el-tab-pane label="Model Card / README" name="readme">
        <ReadmeDiffViewer
          :readmeA="dataA.readme"
          :readmeB="dataB.readme"
          :loading="loadingData"
        />
      </el-tab-pane>

      <!-- Performance Metrics Tab -->
      <el-tab-pane label="Performance Metrics" name="metrics">
        <MetricsCompareViewer
          :metricsA="dataA.metrics"
          :metricsB="dataB.metrics"
          :versionALabel="versionA"
          :versionBLabel="versionB"
          :loading="loadingData"
        />
      </el-tab-pane>

      <!-- Version History Context Tab -->
      <el-tab-pane label="Version History Context" name="history">
        <div class="py-4">
          <div class="text-xs font-semibold text-gray-600 uppercase mb-4">Recent Model Commits Timeline</div>
          <el-timeline v-if="allCommits.length > 0">
            <el-timeline-item
              v-for="commit in allCommits"
              :key="commit.id"
              :timestamp="commit.committer_date"
              :type="commit.id === dataA.commitId ? 'primary' : commit.id === dataB.commitId ? 'success' : 'info'"
            >
              <div class="flex items-center gap-2">
                <span class="font-bold text-sm text-gray-800">{{ commit.message }}</span>
                <el-tag v-if="commit.id === dataA.commitId" size="small" type="primary">Version A</el-tag>
                <el-tag v-if="commit.id === dataB.commitId" size="small" type="success">Version B</el-tag>
              </div>
              <div class="text-xs text-gray-500 font-mono mt-1">
                {{ commit.id.substring(0, 8) }} by {{ commit.author_name }}
              </div>
            </el-timeline-item>
          </el-timeline>
          <el-empty v-else description="No version history available" />
        </div>
      </el-tab-pane>
    </el-tabs>

    <template #footer>
      <div class="flex justify-end gap-2">
        <el-button @click="handleClose">Close</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import useFetchApi from '../../packs/useFetchApi'
import { atob_utf8, createAndClickAnchor } from '../../packs/utils'
import CsgButton from '../shared/CsgButton.vue'
import ConfigDiffViewer from './ConfigDiffViewer.vue'
import ReadmeDiffViewer from './ReadmeDiffViewer.vue'
import MetricsCompareViewer from './MetricsCompareViewer.vue'

const props = defineProps({
  visible: Boolean,
  namespace: String,
  name: String,
  currentBranch: String,
  repoType: { type: String, default: 'model' }
})

const emit = defineEmits(['update:visible'])

const dialogVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

const activeTab = ref('config')
const loadingOptions = ref(false)
const loadingData = ref(false)

const versionOptions = ref([])
const versionA = ref('')
const versionB = ref('')

const dataA = ref({ commitId: '', author: '', date: '', message: '', config: null, readme: null, metrics: null })
const dataB = ref({ commitId: '', author: '', date: '', message: '', config: null, readme: null, metrics: null })
const allCommits = ref([])

const handleClose = () => {
  dialogVisible.value = false
}

// Fetch available branches, tags, and commits for version options
const fetchVersionOptions = async () => {
  if (!props.namespace || !props.name) return
  loadingOptions.value = true

  const options = []
  const existingValues = new Set()

  try {
    // 1. Fetch branches
    const branchesUrl = `/${props.repoType}s/${props.namespace}/${props.name}/branches`
    const { data: branchRes } = await useFetchApi(branchesUrl).json()
    if (branchRes.value?.data && Array.isArray(branchRes.value.data)) {
      branchRes.value.data.forEach((b) => {
        if (b.name && !existingValues.has(b.name)) {
          existingValues.add(b.name)
          options.push({ label: `${b.name} (Branch)`, value: b.name, type: 'branch' })
        }
      })
    }

    // 2. Fetch tags
    const tagsUrl = `/${props.repoType}s/${props.namespace}/${props.name}/tags`
    const { data: tagRes } = await useFetchApi(tagsUrl).json()
    if (tagRes.value?.data && Array.isArray(tagRes.value.data)) {
      tagRes.value.data.forEach((t) => {
        const tagName = t.name || t.tag_name
        if (tagName && !existingValues.has(tagName)) {
          existingValues.add(tagName)
          options.push({ label: `${tagName} (Tag)`, value: tagName, type: 'tag' })
        }
      })
    }

    // 3. Fetch commits for list
    const commitsUrl = `/${props.repoType}s/${props.namespace}/${props.name}/commits?per=20`
    const { data: commitRes } = await useFetchApi(commitsUrl).json()
    if (commitRes.value?.data?.commits) {
      allCommits.value = commitRes.value.data.commits
      commitRes.value.data.commits.forEach((c) => {
        const shortSha = c.id.substring(0, 7)
        if (!existingValues.has(c.id)) {
          existingValues.add(c.id)
          options.push({
            label: `${shortSha} - ${c.message?.slice(0, 30)}... (Commit)`,
            value: c.id,
            type: 'commit'
          })
        }
      })
    }
  } catch (error) {
    console.error('Error fetching version options:', error)
  } finally {
    loadingOptions.value = false
    versionOptions.value = options

    // Set initial defaults if not set
    if (options.length > 0) {
      if (!versionA.value) {
        versionA.value = props.currentBranch || options[0].value
      }
      if (!versionB.value) {
        versionB.value = options.length > 1 ? options[1].value : options[0].value
      }
      fetchComparisonData()
    }
  }
}

// Fetch all resources (commit, config.json, README.md, metrics) for a given ref
const fetchSingleVersionData = async (refStr) => {
  const result = {
    commitId: refStr,
    author: '',
    date: '',
    message: '',
    config: null,
    readme: null,
    metrics: null
  }

  if (!refStr) return result

  const apiPrefix = `${props.repoType}s/${props.namespace}/${props.name}`

  // Fetch in parallel
  await Promise.all([
    // 1. Commit metadata
    (async () => {
      try {
        const { data } = await useFetchApi(`/${apiPrefix}/commits?ref=${refStr}&per=1`).json()
        if (data.value?.data?.commits?.[0]) {
          const c = data.value.data.commits[0]
          result.commitId = c.id
          result.author = c.author_name || c.committer_name
          result.date = c.committer_date || c.created_at
          result.message = c.message
        }
      } catch (e) {
        // ignore error fallback
      }
    })(),

    // 2. config.json
    (async () => {
      try {
        const { data } = await useFetchApi(`/${apiPrefix}/blob/config.json?ref=${refStr}`).json()
        if (data.value?.data?.content) {
          const decoded = atob_utf8(data.value.data.content)
          try {
            result.config = JSON.parse(decoded)
            if (result.config?.metrics || result.config?.results) {
              result.metrics = result.config.metrics || result.config.results
            }
          } catch (e) {
            result.config = decoded
          }
        }
      } catch (e) {
        result.config = null
      }
    })(),

    // 3. README.md
    (async () => {
      try {
        const { data } = await useFetchApi(`/${apiPrefix}/blob/README.md?ref=${refStr}`).json()
        if (data.value?.data?.content) {
          result.readme = atob_utf8(data.value.data.content)
        }
      } catch (e) {
        result.readme = null
      }
    })(),

    // 4. metrics.json / eval_results.json (optional performance metrics file)
    (async () => {
      try {
        const { data } = await useFetchApi(`/${apiPrefix}/blob/metrics.json?ref=${refStr}`).json()
        if (data.value?.data?.content) {
          const decoded = atob_utf8(data.value.data.content)
          try {
            result.metrics = JSON.parse(decoded)
          } catch (e) {
            //
          }
        }
      } catch (e) {
        // ignore
      }
    })()
  ])

  return result
}

const fetchComparisonData = async () => {
  if (!versionA.value || !versionB.value) return
  loadingData.value = true

  try {
    const [resA, resB] = await Promise.all([
      fetchSingleVersionData(versionA.value),
      fetchSingleVersionData(versionB.value)
    ])
    dataA.value = resA
    dataB.value = resB
  } catch (error) {
    ElMessage.error('Failed to fetch version comparison data')
  } finally {
    loadingData.value = false
  }
}

const handleVersionChange = () => {
  fetchComparisonData()
}

// Export comparison report as Markdown document
const exportReport = () => {
  const content = `# CSGHub Model Version Comparison Report

**Model:** \`${props.namespace}/${props.name}\`  
**Generated:** ${new Date().toLocaleString()}  

---

## Version Metadata

| Attribute | Version A (Baseline) | Version B (Target) |
|---|---|---|
| **Version/Ref** | \`${versionA.value}\` | \`${versionB.value}\` |
| **Commit SHA** | \`${dataA.value.commitId || 'N/A'}\` | \`${dataB.value.commitId || 'N/A'}\` |
| **Author** | ${dataA.value.author || 'N/A'} | ${dataB.value.author || 'N/A'} |
| **Date** | ${dataA.value.date || 'N/A'} | ${dataB.value.date || 'N/A'} |
| **Message** | ${dataA.value.message || 'N/A'} | ${dataB.value.message || 'N/A'} |

---

## Configuration / Parameters Summary

- **Version A Config Available:** ${dataA.value.config ? 'Yes' : 'No'}
- **Version B Config Available:** ${dataB.value.config ? 'Yes' : 'No'}

\`\`\`json
// Version A Configuration
${dataA.value.config ? JSON.stringify(dataA.value.config, null, 2) : 'Not available'}
\`\`\`

\`\`\`json
// Version B Configuration
${dataB.value.config ? JSON.stringify(dataB.value.config, null, 2) : 'Not available'}
\`\`\`

---

## Performance Metrics Comparison

${dataA.value.metrics || dataB.value.metrics ? JSON.stringify({ versionA: dataA.value.metrics, versionB: dataB.value.metrics }, null, 2) : 'No performance metrics available.'}

---

## Model Card / README Status

- **Version A README:** ${dataA.value.readme ? 'Available' : 'Not available'}
- **Version B README:** ${dataB.value.readme ? 'Available' : 'Not available'}
`

  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  createAndClickAnchor(url, `comparison-${props.name}-${versionA.value}-vs-${versionB.value}.md`)
}

watch(dialogVisible, (newVal) => {
  if (newVal) {
    fetchVersionOptions()
  }
}, { immediate: true })
</script>

<style scoped>
:deep(.compare-versions-dialog) {
  border-radius: 12px;
}
</style>
