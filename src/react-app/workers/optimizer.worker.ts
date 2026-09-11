import { optimize as svgoOptimize } from 'svgo/browser'
import { encode as encodeJpeg } from '@jsquash/jpeg'
import { encode as encodePng } from '@jsquash/png'
import { optimise as oxipng } from '@jsquash/oxipng'
import type { OptimizeRequest, OptimizeResponse, QualityPreset } from '../types'

interface WorkerMessage {
	type: 'optimize'
	data: OptimizeRequest
}

async function optimizeSVG(file: File, preset: QualityPreset): Promise<Blob> {
	const text = await file.text()
	
	const result = svgoOptimize(text, {
		multipass: preset === 'aggressive',
		floatPrecision: preset === 'aggressive' ? 1 : 3,
	})
	
	return new Blob([result.data], { type: 'image/svg+xml' })
}

async function optimizeJPEG(file: File, preset: QualityPreset): Promise<Blob> {
	const bitmap = await createImageBitmap(file)
	
	const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
	const ctx = canvas.getContext('2d')
	if (!ctx) throw new Error('Failed to get canvas context')
	
	ctx.drawImage(bitmap, 0, 0)
	const imageData = ctx.getImageData(0, 0, bitmap.width, bitmap.height)
	
	const quality = preset === 'lossless' 
		? 95
		: preset === 'balanced'
		? 80
		: 65
	
	const encoded = await encodeJpeg(imageData, { quality })
	return new Blob([encoded], { type: 'image/jpeg' })
}

async function optimizePNG(file: File, preset: QualityPreset): Promise<Blob> {
	const bitmap = await createImageBitmap(file)
	
	const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
	const ctx = canvas.getContext('2d')
	if (!ctx) throw new Error('Failed to get canvas context')
	
	ctx.drawImage(bitmap, 0, 0)
	const imageData = ctx.getImageData(0, 0, bitmap.width, bitmap.height)
	
	let encoded: ArrayBuffer
	
	if (preset === 'lossless') {
		encoded = await encodePng(imageData)
	} else {
		const pngData = await encodePng(imageData)
		const level = preset === 'balanced' ? 2 : 3
		encoded = await oxipng(pngData, { level })
	}
	
	return new Blob([encoded], { type: 'image/png' })
}

async function optimizeImage(request: OptimizeRequest): Promise<OptimizeResponse> {
	try {
		let blob: Blob
		
		switch (request.type) {
			case 'image/svg+xml':
				blob = await optimizeSVG(request.file, request.preset)
				break
			case 'image/jpeg':
				blob = await optimizeJPEG(request.file, request.preset)
				break
			case 'image/png':
				blob = await optimizePNG(request.file, request.preset)
				break
			default:
				throw new Error(`Unsupported file type: ${request.type}`)
		}
		
		return {
			id: request.id,
			success: true,
			blob,
			optimizedSize: blob.size,
		}
	} catch (error) {
		return {
			id: request.id,
			success: false,
			error: error instanceof Error ? error.message : 'Optimization failed',
		}
	}
}

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
	if (event.data.type === 'optimize') {
		const response = await optimizeImage(event.data.data)
		self.postMessage(response)
	}
}
