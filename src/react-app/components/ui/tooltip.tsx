import * as React from "react"
import { cn } from "@/lib/utils"

interface TooltipProps {
	children: React.ReactElement<any>
	content: string
	side?: "top" | "bottom" | "left" | "right"
}

export function Tooltip({ children, content, side = "top" }: TooltipProps) {
	const [isVisible, setIsVisible] = React.useState(false)
	const [isFocused, setIsFocused] = React.useState(false)
	const tooltipId = React.useId()

	const showTooltip = () => setIsVisible(true)
	const hideTooltip = () => {
		if (!isFocused) setIsVisible(false)
	}

	const originalProps = children.props || {}

	const childWithProps = React.cloneElement(children, {
		onMouseEnter: (e: React.MouseEvent) => {
			showTooltip()
			originalProps.onMouseEnter?.(e)
		},
		onMouseLeave: (e: React.MouseEvent) => {
			hideTooltip()
			originalProps.onMouseLeave?.(e)
		},
		onFocus: (e: React.FocusEvent) => {
			setIsFocused(true)
			showTooltip()
			originalProps.onFocus?.(e)
		},
		onBlur: (e: React.FocusEvent) => {
			setIsFocused(false)
			hideTooltip()
			originalProps.onBlur?.(e)
		},
		"aria-describedby": isVisible ? tooltipId : originalProps["aria-describedby"],
	} as any)

	return (
		<div className="relative inline-block">
			{childWithProps}
			{isVisible && (
				<div
					id={tooltipId}
					role="tooltip"
					className={cn(
						"absolute z-50 px-3 py-2 text-xs font-medium text-white bg-gray-900 rounded-lg shadow-sm whitespace-normal max-w-xs",
						side === "top" && "bottom-full left-1/2 -translate-x-1/2 mb-2",
						side === "bottom" && "top-full left-1/2 -translate-x-1/2 mt-2",
						side === "left" && "right-full top-1/2 -translate-y-1/2 mr-2",
						side === "right" && "left-full top-1/2 -translate-y-1/2 ml-2"
					)}
				>
					{content}
					<div
						className={cn(
							"absolute w-2 h-2 bg-gray-900 transform rotate-45",
							side === "top" && "bottom-[-4px] left-1/2 -translate-x-1/2",
							side === "bottom" && "top-[-4px] left-1/2 -translate-x-1/2",
							side === "left" && "right-[-4px] top-1/2 -translate-y-1/2",
							side === "right" && "left-[-4px] top-1/2 -translate-y-1/2"
						)}
					/>
				</div>
			)}
		</div>
	)
}
