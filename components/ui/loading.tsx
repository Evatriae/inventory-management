import { Hatch } from 'ldrs/react'
import 'ldrs/react/Hatch.css'
import { cn } from "@/lib/utils"

interface LoadingProps {
  size?: string
  className?: string
  text?: string
  color?: string
}

export function Loading({ size = "28", className, text, color = "#64748b" }: LoadingProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-4", className)}>
      <Hatch
        size={size}
        stroke="4"
        speed="3.5"
        color={color}
      />
      {text && (
        <p className="text-sm text-muted-foreground">{text}</p>
      )}
    </div>
  )
}

interface PageLoadingProps {
  text?: string
  className?: string
}

export function PageLoading({ text = "Loading...", className }: PageLoadingProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center min-h-[400px]", className)}>
      <Loading size="40" text={text} />
    </div>
  )
}