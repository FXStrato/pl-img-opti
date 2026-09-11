export type ImageFileType = 'image/svg+xml' | 'image/png' | 'image/jpeg'

export type QualityPreset = 'lossless' | 'balanced' | 'aggressive'

export type FileStatus = 'queued' | 'optimizing' | 'done' | 'failed'

export interface ImageFile {
	id: string
	file: File
	type: ImageFileType
	originalSize: number
	optimizedSize?: number
	status: FileStatus
	progress: number
	error?: string
	optimizedBlob?: Blob
	thumbnailUrl?: string
}

export interface OptimizeRequest {
	id: string
	file: File
	type: ImageFileType
	preset: QualityPreset
}

export interface OptimizeResponse {
	id: string
	success: boolean
	blob?: Blob
	optimizedSize?: number
	error?: string
}

export interface ProgressUpdate {
	id: string
	progress: number
}
