import { Toast, ToastActionElement, ToastProps } from "@/components/ui/toast"
import {
  useToast as useToastImpl,
  toast as toastImpl,
} from "@/components/ui/use-toast"

export type ToasterToast = ToastProps & {
  id: string
  title?: string
  description?: string
  action?: ToastActionElement
}

export function useToast() {
  const { toast, dismiss } = useToastImpl()
  return { toast, dismiss }
}

export { Toast as showToast, ToastAction, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast"