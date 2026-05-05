import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { Toast, type ToastType } from "./Toast";
import { CustomModal } from "./CustomModal";
import { useDashboardTheme } from "../theme/ThemeProvider";

interface ToastData {
  id: string;
  message: string;
  type: ToastType;
}

interface DialogData {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  isConfirmOnly?: boolean;
}

interface PromptData {
  title: string;
  message: string;
  placeholder?: string;
  defaultValue?: string;
  onSubmit: (value: string) => void;
  onCancel?: () => void;
}

interface NotificationContextType {
  toast: (message: string, type?: ToastType) => void;
  confirm: (data: DialogData) => void;
  alert: (title: string, message: string) => void;
  prompt: (data: PromptData) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const [dialog, setDialog] = useState<DialogData | null>(null);
  const [promptData, setPromptData] = useState<PromptData | null>(null);
  const [promptValue, setPromptValue] = useState("");
  const { theme } = useDashboardTheme();
  const isDark = theme === "dark";

  const addToast = useCallback((message: string, type: ToastType = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showConfirm = useCallback((data: DialogData) => {
    setDialog(data);
  }, []);

  const showAlert = useCallback((title: string, message: string) => {
    setDialog({
      title,
      message,
      confirmLabel: "OK",
      isConfirmOnly: true,
      onConfirm: () => setDialog(null),
    });
  }, []);

  const showPrompt = useCallback((data: PromptData) => {
    setPromptData(data);
    setPromptValue(data.defaultValue || "");
  }, []);

  const handlePromptSubmit = () => {
    if (promptData) {
      promptData.onSubmit(promptValue);
      setPromptData(null);
      setPromptValue("");
    }
  };

  return (
    <NotificationContext.Provider value={{ toast: addToast, confirm: showConfirm, alert: showAlert, prompt: showPrompt }}>
      {children}
      
      {/* Toast Container */}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[200] flex flex-col items-end">
        {toasts.map((t) => (
          <Toast key={t.id} {...t} onClose={removeToast} />
        ))}
      </div>

      {/* Confirmation Dialog */}
      {dialog && (
        <CustomModal
          isOpen={true}
          onClose={() => !dialog.isConfirmOnly && setDialog(null)}
          title={dialog.title}
          footer={
            <>
              {!dialog.isConfirmOnly && (
                <button
                  onClick={() => {
                    setDialog(null);
                    dialog.onCancel?.();
                  }}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                    isDark ? "text-[#7A7572] hover:bg-white/5" : "text-[#6B7280] hover:bg-[#F3F4F6]"
                  }`}
                >
                  {dialog.cancelLabel || "Cancel"}
                </button>
              )}
              <button
                onClick={() => {
                  setDialog(null);
                  dialog.onConfirm();
                }}
                className={`rounded-xl px-6 py-2 text-sm font-semibold text-white shadow-lg transition-all ${
                  isDark ? "bg-[#C9A96E] hover:bg-[#E8C98A]" : "bg-[#8B5E3C] hover:bg-[#6E472B]"
                }`}
              >
                {dialog.confirmLabel || "Confirm"}
              </button>
            </>
          }
        >
          <p className={`text-[15px] leading-relaxed ${isDark ? "text-[#C8BFB4]" : "text-[#4B5563]"}`}>
            {dialog.message}
          </p>
        </CustomModal>
      )}

      {/* Prompt Modal */}
      {promptData && (
        <CustomModal
          isOpen={true}
          onClose={() => setPromptData(null)}
          title={promptData.title}
          footer={
            <>
              <button
                onClick={() => {
                  setPromptData(null);
                  promptData.onCancel?.();
                }}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                  isDark ? "text-[#7A7572] hover:bg-white/5" : "text-[#6B7280] hover:bg-[#F3F4F6]"
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handlePromptSubmit}
                className={`rounded-xl px-6 py-2 text-sm font-semibold text-white shadow-lg transition-all ${
                  isDark ? "bg-[#C9A96E] hover:bg-[#E8C98A]" : "bg-[#8B5E3C] hover:bg-[#6E472B]"
                }`}
              >
                Submit
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <p className={`text-[15px] leading-relaxed ${isDark ? "text-[#C8BFB4]" : "text-[#4B5563]"}`}>
              {promptData.message}
            </p>
            <input
              type="text"
              autoFocus
              value={promptValue}
              placeholder={promptData.placeholder}
              onChange={(e) => setPromptValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handlePromptSubmit()}
              className={`w-full rounded-xl border px-4 py-3 text-[14px] outline-none transition-all ${
                isDark 
                  ? "bg-[#1C2030] border-[rgba(255,255,255,0.08)] text-[#F0EBE3] focus:border-[#C9A96E]" 
                  : "bg-[#FAF7F3] border-[#E8E1D8] text-[#111827] focus:border-[#8B5E3C]"
              }`}
            />
          </div>
        </CustomModal>
      )}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error("useNotifications must be used within a NotificationProvider");
  return context;
}
