'use client'

import { cn } from '@/core/lib/utils';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/shared/components/ui/pagination/core'
import { motion } from 'framer-motion'

export type BasicPaginationProps = {
  totalPages: number
  page?: number
  initialPage?: number
  siblings?: number
  boundaries?: number
  onPageChange?: (page: number) => void
  className?: string
  variant?: 'default' | 'outline' | 'rounded'
  animate?: boolean
}

function BasicPagination({
  totalPages,
  page,
  initialPage = 1,
  siblings = 1,
  boundaries = 1,
  onPageChange,
  className,
  variant = 'default',
  animate = true,
}: BasicPaginationProps) {
  const onChangeRef = useRef<BasicPaginationProps['onPageChange']>(onPageChange)
  useEffect(() => {
    onChangeRef.current = onPageChange
  }, [onPageChange])
  const isControlled = typeof page === 'number'
  const [uncontrolledPage, setUncontrolledPage] = useState(initialPage)
  const currentPage = isControlled ? (page as number) : uncontrolledPage

  const clamp = useCallback(
    (p: number) => Math.min(Math.max(1, p), Math.max(1, totalPages)),
    [totalPages]
  )

  const setPage = useCallback(
    (p: number) => {
      const next = clamp(p)
      if (next === currentPage) return
      if (!isControlled) setUncontrolledPage(next)
      onChangeRef.current?.(next)
    },
    [clamp, currentPage, isControlled]
  )

  const items = useMemo(() => {
    if (totalPages <= 0) return [1]
    const startPages = Array.from({ length: Math.min(boundaries, totalPages) }, (_, i) => i + 1)
    const endPages = Array.from({ length: Math.min(boundaries, totalPages) }, (_, i) => totalPages - i).reverse()

    const leftSibling = Math.max(currentPage - siblings, 1)
    const rightSibling = Math.min(currentPage + siblings, totalPages)

    const range: (number | 'dots')[] = []
    const addRange = (a: number, b: number) => {
      for (let i = a; i <= b; i++) range.push(i)
    }

    if (startPages.length) addRange(startPages[0], startPages[startPages.length - 1])

    const needLeftDots = leftSibling > boundaries + 2
    const needRightDots = rightSibling < totalPages - boundaries - 1
    const middleStart = needLeftDots ? leftSibling : boundaries + 1
    const middleEnd = needRightDots ? rightSibling : totalPages - boundaries
    if (middleEnd >= middleStart) addRange(middleStart, middleEnd)

    const lastInRange = typeof range[range.length - 1] === 'number' ? (range[range.length - 1] as number) : 0
    endPages.forEach((p) => {
      if (p > lastInRange) range.push(p)
    })

    const withDots: (number | 'dots')[] = []
    for (let i = 0; i < range.length; i++) {
      const prev = range[i - 1]
      const curr = range[i]
      if (typeof prev === 'number' && typeof curr === 'number' && curr - prev > 1) {
        withDots.push('dots')
      }
      withDots.push(curr)
    }
    return withDots
  }, [boundaries, currentPage, siblings, totalPages])

  const itemVariants = useMemo(() => ({
    initial: { opacity: 0, y: 5 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -5 },
    hover: { scale: 1.05, transition: { duration: 0.2 } },
  }), [])

  const linkClass = variant === 'rounded' ? 'rounded-full' : variant === 'outline' ? 'border' : undefined

  const Wrap = ({ children }: { children: React.ReactNode }) =>
    animate ? (
      <motion.div initial="initial" animate="animate" exit="exit" whileHover="hover" variants={itemVariants}>
        {children}
      </motion.div>
    ) : (
      <>{children}</>
  );

  return (
    <Pagination className={cn('py-4', className)}>
      <PaginationContent>
        <PaginationItem>
          <Wrap>
            <PaginationPrevious
              href="#"
              onClick={(e) => {
                e.preventDefault()
                setPage(currentPage - 1)
              }}
              className={cn(currentPage <= 1 && 'pointer-events-none opacity-50', linkClass)}
            />
          </Wrap>
        </PaginationItem>

        {items.map((it, idx) =>
          it === 'dots' ? (
            <PaginationItem key={`dots-${idx}`}>
              <Wrap>
                <PaginationEllipsis />
              </Wrap>
            </PaginationItem>
          ) : (
            <PaginationItem key={it}>
              <Wrap>
                <PaginationLink
                  href="#"
                  isActive={it === currentPage}
                  onClick={(e) => {
                    e.preventDefault()
                    setPage(it as number)
                  }}
                  className={cn(linkClass, 'transition-all duration-200')}
                >
                  {it}
                </PaginationLink>
              </Wrap>
            </PaginationItem>
          )
        )}

        <PaginationItem>
          <Wrap>
            <PaginationNext
              href="#"
              onClick={(e) => {
                e.preventDefault()
                setPage(currentPage + 1)
              }}
              className={cn(currentPage >= totalPages && 'pointer-events-none opacity-50', linkClass)}
            />
          </Wrap>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}

function areEqual(prev: Readonly<BasicPaginationProps>, next: Readonly<BasicPaginationProps>) {
  return (
    prev.totalPages === next.totalPages &&
    prev.page === next.page &&
    prev.initialPage === next.initialPage &&
    prev.siblings === next.siblings &&
    prev.boundaries === next.boundaries &&
    prev.className === next.className &&
    prev.variant === next.variant &&
    prev.animate === next.animate
  );
}

export default React.memo(BasicPagination, areEqual)