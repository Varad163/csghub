import { describe, it, expect, vi, beforeEach } from "vitest"
import { mount, flushPromises } from "@vue/test-utils"
import DatasetExplorer from "../../datasets/DatasetExplorer.vue"

// Mock vue-i18n
vi.mock("vue-i18n", () => ({
  useI18n: () => ({
    t: (key) => key
  })
}))

const mockTreeData = [
  { path: "train.csv", type: "blob" },
  { path: "dataset_info.json", type: "blob" },
  { path: "README.md", type: "blob" }
]

const mockCsvText = "id,name,accuracy,validated\n1,model-a,88.5,true\n2,model-b,91.2,false"

vi.mock("../../../packs/useFetchApi", () => ({
  default: (url) => {
    if (url.includes("/tree")) {
      return {
        json: () => Promise.resolve({ data: { value: { data: mockTreeData } }, error: { value: null } })
      }
    }
    if (url.includes("/raw")) {
      return {
        text: () => Promise.resolve({ data: { value: mockCsvText }, error: { value: null } })
      }
    }
    return {
      json: () => Promise.resolve({ data: { value: null }, error: { value: null } }),
      text: () => Promise.resolve({ data: { value: null }, error: { value: null } })
    }
  }
}))

describe("DatasetExplorer Component", () => {
  let wrapper

  beforeEach(async () => {
    wrapper = mount(DatasetExplorer, {
      props: {
        namespacePath: "test-user/test-dataset",
        currentBranch: "main"
      },
      global: {
        stubs: {
          ElSelect: true,
          ElOption: true,
          ElTag: true,
          ElInput: true,
          ElSkeleton: true,
          ElEmpty: true,
          ElCollapse: true,
          ElCollapseItem: true,
          ElTable: true,
          ElTableColumn: true
        }
      }
    })
    await flushPromises()
  })

  it("mounts correctly and fetches dataset files", () => {
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.find(".dataset-explorer").exists()).toBe(true)
  })

  it("detects tabular dataset files from tree API", () => {
    expect(wrapper.vm.tabularFiles.length).toBeGreaterThan(0)
    expect(wrapper.vm.selectedFile).toBe("train.csv")
  })

  it("parses CSV content and extracts statistical insights", async () => {
    await wrapper.vm.loadFileData()
    await flushPromises()

    expect(wrapper.vm.columns).toContain("id")
    expect(wrapper.vm.columns).toContain("name")
    expect(wrapper.vm.columns).toContain("accuracy")

    expect(wrapper.vm.totalRows).toBe(2)
    expect(wrapper.vm.columnStats.length).toBe(4)
  })

  it("filters records dynamically via search query", async () => {
    await wrapper.vm.loadFileData()
    await flushPromises()

    wrapper.vm.searchQuery = "model-a"
    expect(wrapper.vm.filteredRows.length).toBe(1)
    expect(wrapper.vm.filteredRows[0].name).toBe("model-a")
  })

  it("handles empty / mock fallback gracefully when API returns no files", async () => {
    const emptyWrapper = mount(DatasetExplorer, {
      props: {
        namespacePath: "",
        currentBranch: "main"
      },
      global: {
        stubs: {
          ElSelect: true,
          ElOption: true,
          ElTag: true,
          ElInput: true,
          ElSkeleton: true,
          ElEmpty: true,
          ElCollapse: true,
          ElCollapseItem: true,
          ElTable: true,
          ElTableColumn: true
        }
      }
    })
    await flushPromises()

    expect(emptyWrapper.vm.tabularFiles.length).toBeGreaterThan(0)
    expect(emptyWrapper.vm.selectedFile).toBeTruthy()
  })
})
