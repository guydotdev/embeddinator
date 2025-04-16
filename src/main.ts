import { pipeline } from '@huggingface/transformers'

const modelSelector = document.querySelector('#image-model') as HTMLSelectElement
const imageSelector = document.querySelector('#image-input') as HTMLInputElement
const formatSelector = document.querySelector('#embedding-format') as HTMLSelectElement
const generateButton = document.querySelector('#generate-button') as HTMLButtonElement
const embeddingForm = document.querySelector('#embedding-form') as HTMLFormElement
const embeddingOutputArea = document.querySelector('#embedding-output') as HTMLTextAreaElement
const overlayElement = document.querySelector('#wait-overlay') as HTMLDivElement

embeddingForm.addEventListener('submit', onGenerateFormSubmitted)

async function onGenerateFormSubmitted(event: Event) {
  event.preventDefault()

  if (embeddingForm.checkValidity()) {
    await generate()
  } else {
    embeddingForm.reportValidity()
  }
}

async function generate() {
  disableForm()

  const imageUrl = await downloadImage()
  try {
    const embedding = await generateEmbedding(imageUrl)
    const result = formatEmbedding(embedding)
    embeddingOutputArea.value = result
  } finally {
    URL.revokeObjectURL(imageUrl)
  }

  enableForm()
}

function disableForm() {
  generateButton.disabled = true
  overlayElement.classList.remove('hidden')
}

function enableForm() {
  generateButton.disabled = false
  overlayElement.classList.add('hidden')
}

async function downloadImage(): Promise<string> {
  const imageFile = imageSelector.files?.[0]
  if (!imageFile) throw new Error('No image file selected')

  const buffer = await imageFile.arrayBuffer()
  const blob = new Blob([buffer])
  const url = URL.createObjectURL(blob)

  return url
}

async function generateEmbedding(imageUrl: string): Promise<Float32Array> {
  const model = modelSelector.value
  const featureExtractor = await pipeline('image-feature-extraction', model, { dtype: 'fp32' })

  const tensor = await featureExtractor(imageUrl)
  const data = tensor.data as Float32Array

  return data
}

function formatEmbedding(embedding: Float32Array) {
  const format = formatSelector.value
  switch (format) {
    case 'base64':
      return formatAsBase64(embedding)
    case 'hex':
      return formatAsHex(embedding)
    case 'json':
      return formatAsJson(embedding)
    case 'json-download':
      downloadJson(embedding)
      return ''
    case 'raw':
      downloadRawBytes(embedding)
      return ''
    default:
      throw new Error(`Unsupported format: ${format}`)
  }
}

function formatAsBase64(embedding: Float32Array): string {
  const bytes = formatAsRawBytes(embedding)
  const binary = Array.from(bytes)
    .map(byte => String.fromCharCode(byte))
    .join('')
  return btoa(binary)
}

function formatAsHex(embedding: Float32Array): string {
  const bytes = formatAsRawBytes(embedding)
  return Array.from(bytes)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')
}

function formatAsJson(embedding: Float32Array): string {
  return JSON.stringify(Array.from(embedding))
}

function downloadJson(embedding: Float32Array) {
  const json = formatAsJson(embedding)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const filename = generateFilename('json')
  triggerDownload(url, filename)
  URL.revokeObjectURL(url)
}

function downloadRawBytes(embedding: Float32Array) {
  const bytes = formatAsRawBytes(embedding)
  const blob = new Blob([bytes], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const filename = generateFilename('bin')

  triggerDownload(url, filename)

  URL.revokeObjectURL(url)
}

function formatAsRawBytes(embedding: Float32Array): Uint8Array {
  return new Uint8Array(embedding.buffer)
}

function triggerDownload(url: string, filename: string) {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

function generateFilename(extension: 'json' | 'bin'): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  return `embedding-${timestamp}.${extension}`
}
