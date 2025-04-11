import { pipeline } from '@huggingface/transformers'

const modelSelector = document.querySelector('#image-model') as HTMLSelectElement
const imageSelector = document.querySelector('#image-input') as HTMLInputElement
const formatSelector = document.querySelector('#embedding-format') as HTMLSelectElement
const embeddingForm = document.querySelector('#embedding-form') as HTMLFormElement
const embeddingOutputArea = document.querySelector('#embedding-output') as HTMLTextAreaElement

embeddingForm.addEventListener('submit', onGenerateButtonClicked)

async function onGenerateButtonClicked(event: Event) {
  event.preventDefault()

  if (embeddingForm.checkValidity()) {
    const imageUrl = await downloadImage()
    const embedding = await generateEmbedding(imageUrl)
    const result = formatEmbedding(embedding)
    embeddingOutputArea.value = result
  } else {
    embeddingForm.reportValidity()
  }
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

function formatAsRawBytes(embedding: Float32Array): Uint8Array {
  return new Uint8Array(embedding.buffer)
}
