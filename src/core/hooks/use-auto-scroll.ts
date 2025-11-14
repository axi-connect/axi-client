import { useCallback, useEffect, useRef, useState } from "react"

type UseAutoScrollOptions = {
	/**
	 * Values that, when changed, should trigger an auto-scroll check.
	 * Usually the messages length.
	 */
	deps: ReadonlyArray<unknown>
	/**
	 * Distance in pixels from the bottom considered "near bottom".
	 */
	thresholdPx?: number
	/**
	 * If true, scrolls to bottom on mount.
	 */
	stickOnMount?: boolean
	/**
	 * Scroll behavior
	 */
	behavior?: ScrollBehavior
}

export function useAutoScroll<TElement extends HTMLElement>({
	deps,
	thresholdPx = 120,
	stickOnMount = true,
	behavior = "smooth",
}: UseAutoScrollOptions) {
	const containerRef = useRef<TElement | null>(null)
	const bottomRef = useRef<HTMLDivElement | null>(null)
	const [isNearBottom, setIsNearBottom] = useState(true)
	const initialMountRef = useRef(true)

	const computeIsNearBottom = useCallback(() => {
		const el = containerRef.current
		if (!el) return true
		const distanceFromBottom = el.scrollHeight - (el.scrollTop + el.clientHeight)
		return distanceFromBottom <= thresholdPx
	}, [thresholdPx])

	const updateNearBottom = useCallback(() => {
		setIsNearBottom(computeIsNearBottom())
	}, [computeIsNearBottom])

	const scrollToBottom = useCallback(
		(customBehavior?: ScrollBehavior) => {
			const target = bottomRef.current
			if (!target) return
			target.scrollIntoView({ block: "end", inline: "nearest", behavior: customBehavior ?? behavior })
		},
		[behavior],
	)

	useEffect(() => {
		const el = containerRef.current
		if (!el) return
		// Initialize near-bottom state
		updateNearBottom()
		const onScroll = () => updateNearBottom()
		el.addEventListener("scroll", onScroll, { passive: true })
		return () => el.removeEventListener("scroll", onScroll)
	}, [updateNearBottom])

	// Scroll on mount if desired
	useEffect(() => {
		if (initialMountRef.current) {
			initialMountRef.current = false
			if (stickOnMount) {
				// Use smooth to match requested UX
				scrollToBottom(behavior)
			}
			return
		}
		// On subsequent deps changes (e.g., new message),
		// only auto-scroll if user is near bottom.
		if (isNearBottom) {
			scrollToBottom(behavior)
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, deps)

	return {
		containerRef,
		bottomRef,
		isNearBottom,
		scrollToBottom,
	}
}