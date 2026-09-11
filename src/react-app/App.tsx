import { useState, useRef, useCallback, useEffect } from 'react'
import { IoBonfireSharp } from 'react-icons/io5'
import {
	RiUploadCloudLine,
	RiDownloadLine,
	RiCheckLine,
	RiErrorWarningLine,
	RiLoader4Line,
	RiTimeLine,
	RiArchiveLine,
	RiCloseLine,
} from 'react-icons/ri'
import { Button } from './components/ui/button'
import { Card, CardContent } from './components/ui/card'
import { Tooltip } from './components/ui/tooltip'
import { cn, formatBytes } from './lib/utils'
import { zipSync } from 'fflate'
import type {
	ImageFile,
	QualityPreset,
	OptimizeResponse,
	ImageFileType,
} from './types'
import OptimizerWorker from './workers/optimizer.worker?worker'

const ACCEPTED_TYPES = ['image/svg+xml', 'image/png', 'image/jpeg']

function App() {
	const [files, setFiles] = useState<ImageFile[]>([])
	const [preset, setPreset] = useState<QualityPreset>('balanced')
	const [isDragging, setIsDragging] = useState(false)
	const [rejectedFiles, setRejectedFiles] = useState<string>('')
	const fileInputRef = useRef<HTMLInputElement>(null)
	const workerRef = useRef<Worker | null>(null)
	const dropzoneRef = useRef<HTMLLabelElement>(null)

	useEffect(() => {
		workerRef.current = new OptimizerWorker()
		
		workerRef.current.onmessage = (event: MessageEvent<OptimizeResponse>) => {
			const response = event.data
			setFiles((prev) =>
				prev.map((f) =>
					f.id === response.id
						? {
								...f,
								status: response.success ? 'done' : 'failed',
								optimizedSize: response.optimizedSize,
								optimizedBlob: response.blob,
								error: response.error,
								progress: 100,
						  }
						: f
				)
			)
		}

		return () => {
			workerRef.current?.terminate()
		}
	}, [])

	useEffect(() => {
		const queuedFiles = files.filter((f) => f.status === 'queued')
		if (queuedFiles.length > 0 && workerRef.current) {
			const file = queuedFiles[0]
			setFiles((prev) =>
				prev.map((f) =>
					f.id === file.id ? { ...f, status: 'optimizing', progress: 0 } : f
				)
			)
			
			workerRef.current.postMessage({
				type: 'optimize',
				data: {
					id: file.id,
					file: file.file,
					type: file.type,
					preset: file.preset,
				},
			})
		}
	}, [files])

	const createThumbnail = useCallback((file: File): Promise<string> => {
		return new Promise((resolve) => {
			const reader = new FileReader()
			reader.onload = (e) => {
				resolve(e.target?.result as string)
			}
			reader.readAsDataURL(file)
		})
	}, [])

	const addFiles = useCallback(
		async (fileList: FileList | File[]) => {
			const filesArray = Array.from(fileList)
			const validFiles = filesArray.filter((file) =>
				ACCEPTED_TYPES.includes(file.type)
			)
			const rejectedCount = filesArray.length - validFiles.length

			if (rejectedCount > 0) {
				const message = `${rejectedCount} file${rejectedCount > 1 ? 's' : ''} skipped (unsupported format). Only SVG, PNG, and JPEG are accepted.`
				setRejectedFiles(message)
				setTimeout(() => setRejectedFiles(''), 5000)
			}

		const newFiles: ImageFile[] = await Promise.all(
			validFiles.map(async (file) => ({
				id: `${Date.now()}-${Math.random()}`,
				file,
				type: file.type as ImageFileType,
				originalSize: file.size,
				status: 'queued' as const,
				progress: 0,
				thumbnailUrl: await createThumbnail(file),
				preset,
			}))
		)

		setFiles((prev) => [...prev, ...newFiles])
	},
	[createThumbnail, preset]
)

	const handleDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault()
			setIsDragging(false)
			addFiles(e.dataTransfer.files)
		},
		[addFiles]
	)

	const handleDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault()
		setIsDragging(true)
	}, [])

	const handleDragLeave = useCallback((e: React.DragEvent) => {
		e.preventDefault()
		if (e.currentTarget === dropzoneRef.current) {
			setIsDragging(false)
		}
	}, [])

	const handleFileSelect = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			if (e.target.files) {
				addFiles(e.target.files)
			}
		},
		[addFiles]
	)

	const downloadFile = useCallback((file: ImageFile) => {
		if (!file.optimizedBlob) return

		const url = URL.createObjectURL(file.optimizedBlob)
		const a = document.createElement('a')
		a.href = url
		a.download = file.file.name
		document.body.appendChild(a)
		a.click()
		document.body.removeChild(a)
		URL.revokeObjectURL(url)
	}, [])

	const downloadAllAsZip = useCallback(() => {
		const doneFiles = files.filter((f) => f.status === 'done' && f.optimizedBlob)
		if (doneFiles.length === 0) return

		const filesForZip: Record<string, Uint8Array> = {}
		
		let processed = 0
		const processNext = async () => {
			if (processed >= doneFiles.length) {
				const zipped = zipSync(filesForZip, { level: 6 })
				const blob = new Blob([zipped], { type: 'application/zip' })
				const url = URL.createObjectURL(blob)
				const a = document.createElement('a')
				a.href = url
				a.download = 'optimized-images.zip'
				document.body.appendChild(a)
				a.click()
				document.body.removeChild(a)
				URL.revokeObjectURL(url)
				return
			}

			const file = doneFiles[processed]
			const buffer = await file.optimizedBlob!.arrayBuffer()
			filesForZip[file.file.name] = new Uint8Array(buffer)
			processed++
			processNext()
		}

		processNext()
	}, [files])

	const removeFile = useCallback((fileId: string) => {
		setFiles((prev) => {
			const file = prev.find((f) => f.id === fileId)
			if (file) {
				if (file.thumbnailUrl) {
					URL.revokeObjectURL(file.thumbnailUrl)
				}
				if (file.optimizedBlob) {
					URL.revokeObjectURL(URL.createObjectURL(file.optimizedBlob))
				}
			}
			return prev.filter((f) => f.id !== fileId)
		})
	}, [])

	const totalOriginalSize = files.reduce((acc, f) => acc + f.originalSize, 0)
	const totalOptimizedSize = files.reduce(
		(acc, f) => acc + (f.optimizedSize || 0),
		0
	)
	const totalSavings =
		totalOriginalSize > 0
			? Math.round(((totalOriginalSize - totalOptimizedSize) / totalOriginalSize) * 100)
			: 0
	const doneCount = files.filter((f) => f.status === 'done').length

	return (
		<div className="min-h-screen bg-background">
			<header className="border-b">
				<div className="container mx-auto px-4 py-4">
					<div className="flex items-center gap-3">
						<IoBonfireSharp className="h-8 w-8 text-primary" aria-hidden="true" />
						<h1 className="text-2xl font-bold">PL Image Optimizer</h1>
					</div>
				</div>
			</header>

			<main className="container mx-auto px-4 py-8 max-w-6xl">
				<div className="space-y-6">
					<Card>
						<CardContent className="p-6">
							<div className="space-y-6">
								<div>
									<label className="block text-sm font-medium mb-3">
										Quality Preset
									</label>
									<div
										className="flex rounded-lg border p-1 w-fit"
										role="group"
										aria-label="Quality preset"
									>
										<Tooltip
											content="SVG: Basic minification. PNG: Standard encode + OxiPNG level 1. JPEG: MozJPEG quality 95 (high quality, not mathematically lossless)."
											side="bottom"
										>
											<Button
												variant={preset === 'lossless' ? 'secondary' : 'ghost'}
												size="sm"
												onClick={() => setPreset('lossless')}
												aria-pressed={preset === 'lossless'}
											>
												Lossless
											</Button>
										</Tooltip>
										<Tooltip
											content="SVG: Standard optimization. PNG: Standard encode + OxiPNG level 2. JPEG: MozJPEG quality 80."
											side="bottom"
										>
											<Button
												variant={preset === 'balanced' ? 'secondary' : 'ghost'}
												size="sm"
												onClick={() => setPreset('balanced')}
												aria-pressed={preset === 'balanced'}
											>
												Balanced
											</Button>
										</Tooltip>
										<Tooltip
											content="SVG: Multipass/maximum minification. PNG: Standard encode + OxiPNG level 3. JPEG: MozJPEG quality 65."
											side="bottom"
										>
											<Button
												variant={preset === 'aggressive' ? 'secondary' : 'ghost'}
												size="sm"
												onClick={() => setPreset('aggressive')}
												aria-pressed={preset === 'aggressive'}
											>
												Aggressive
											</Button>
										</Tooltip>
									</div>
								</div>

								<label
									ref={dropzoneRef}
									onDrop={handleDrop}
									onDragOver={handleDragOver}
									onDragLeave={handleDragLeave}
									className={cn(
										'block border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors',
										'focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
										isDragging
											? 'border-primary bg-primary/5'
											: 'border-border hover:border-primary/50'
									)}
								>
									<RiUploadCloudLine
										className="mx-auto h-16 w-16 text-muted-foreground mb-4"
										aria-hidden="true"
									/>
									<p className="text-lg font-medium mb-2">
										Drop SVG, PNG, or JPEG
									</p>
									<p className="text-sm text-muted-foreground mb-4">or</p>
									<span className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 transition-colors">
										Browse files
									</span>
									<input
										ref={fileInputRef}
										type="file"
										multiple
										accept=".svg,.png,.jpg,.jpeg,image/svg+xml,image/png,image/jpeg"
										onChange={handleFileSelect}
										className="sr-only"
										aria-label="Upload images: SVG, PNG, or JPEG"
									/>
								</label>
							</div>
						</CardContent>
					</Card>

					{rejectedFiles && (
						<div
							className="p-4 rounded-lg border border-destructive/50 bg-destructive/10 text-destructive"
							role="alert"
							aria-live="polite"
						>
							<div className="flex items-center gap-2">
								<RiErrorWarningLine className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
								<p className="text-sm font-medium">{rejectedFiles}</p>
							</div>
						</div>
					)}

					{files.length > 0 && (
						<>
							<div
								className="overflow-x-auto"
								role="region"
								aria-label="Image optimization queue"
							>
								<table className="w-full border-collapse">
									<thead>
										<tr className="border-b bg-muted/50">
											<th className="text-left p-3 font-medium" scope="col">
												File
											</th>
											<th className="text-center p-3 font-medium" scope="col">
												Preset
											</th>
											<th className="text-right p-3 font-medium" scope="col">
												Original Size
											</th>
											<th className="text-right p-3 font-medium" scope="col">
												Optimized Size
											</th>
											<th className="text-right p-3 font-medium" scope="col">
												Savings
											</th>
											<th className="text-center p-3 font-medium" scope="col">
												Status
											</th>
											<th className="text-right p-3 font-medium" scope="col">
												<span className="sr-only">Actions</span>
											</th>
										</tr>
									</thead>
									<tbody>
										{files.map((file) => (
											<tr key={file.id} className="border-b">
												<td className="p-3">
													<div className="flex items-center gap-3">
														{file.thumbnailUrl && (
															<img
																src={file.thumbnailUrl}
																alt=""
																className="w-10 h-10 object-cover rounded border"
																aria-hidden="true"
															/>
														)}
														<span className="font-medium text-sm truncate max-w-xs">
															{file.file.name}
														</span>
													</div>
												</td>
												<td className="p-3 text-center text-sm">
													<span className="capitalize">{file.preset}</span>
												</td>
												<td className="p-3 text-right text-sm">
													{formatBytes(file.originalSize)}
												</td>
												<td className="p-3 text-right text-sm">
													{file.optimizedSize
														? formatBytes(file.optimizedSize)
														: '—'}
												</td>
												<td className="p-3 text-right text-sm">
													{file.optimizedSize
														? `${Math.round(
																((file.originalSize - file.optimizedSize) /
																	file.originalSize) *
																	100
														  )}%`
														: '—'}
												</td>
												<td className="p-3">
													<div className="flex flex-col items-center gap-2">
														{file.status === 'queued' && (
															<div className="flex items-center gap-2 text-muted-foreground">
																<RiTimeLine aria-hidden="true" />
																<span className="text-sm">Queued</span>
															</div>
														)}
													{file.status === 'optimizing' && (
														<div className="flex items-center gap-2 text-primary">
															<RiLoader4Line
																className="animate-spin"
																aria-hidden="true"
															/>
															<span className="text-sm">Optimizing</span>
														</div>
													)}
														{file.status === 'done' && (
															<div className="flex items-center gap-2 text-green-600">
																<RiCheckLine aria-hidden="true" />
																<span className="text-sm">Done</span>
															</div>
														)}
														{file.status === 'failed' && (
															<div className="flex items-center gap-2 text-destructive">
																<RiErrorWarningLine aria-hidden="true" />
																<span className="text-sm">Failed</span>
															</div>
														)}
													</div>
												</td>
												<td className="p-3">
													<div className="flex items-center justify-end gap-2">
														{file.status === 'done' && (
															<Button
																variant="outline"
																size="sm"
																onClick={() => downloadFile(file)}
																aria-label={`Download optimized ${file.file.name}`}
															>
																<RiDownloadLine aria-hidden="true" />
																Download
															</Button>
														)}
														<Button
															variant="ghost"
															size="sm"
															onClick={() => removeFile(file.id)}
															aria-label={`Remove ${file.file.name} from list`}
														>
															<RiCloseLine aria-hidden="true" />
															Remove
														</Button>
													</div>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>

						<Card>
							<CardContent className="p-4">
								<div className="flex flex-wrap items-center justify-between gap-4">
									<div className="flex items-center gap-6 text-sm">
										<div>
											<span className="text-muted-foreground">Files: </span>
											<span className="font-medium">
												{files.length} ({formatBytes(totalOriginalSize)} →{' '}
												{formatBytes(totalOptimizedSize)})
											</span>
										</div>
										<div>
											<span className="text-muted-foreground">Saved: </span>
											<span className="font-medium text-green-600">
												{totalSavings}%
											</span>
										</div>
									</div>

									{files.length > 1 && (
										<Button
											onClick={downloadAllAsZip}
											disabled={doneCount === 0}
											aria-label={`Download all ${doneCount} optimized images as ZIP`}
										>
											<RiArchiveLine aria-hidden="true" />
											Download ZIP
										</Button>
									)}
								</div>
							</CardContent>
						</Card>
						</>
					)}
				</div>

				<div
					role="status"
					aria-live="polite"
					aria-atomic="true"
					className="sr-only"
				>
					{files.length > 0 &&
						`${doneCount} of ${files.length} images optimized. ${
							files.filter((f) => f.status === 'failed').length
						} failed.`}
				</div>
			</main>
		</div>
	)
}

export default App
