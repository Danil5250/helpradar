export type FlashKind = 'success' | 'info' | 'alert';

export interface FlashMessage {
  id: number;
  kind: FlashKind;
  text: string;
}

let counter = 0;

export const useFlash = () => {
  const message = useState<FlashMessage | null>('flash.message', () => null);

  function show(text: string, kind: FlashKind = 'success'): void {
    counter += 1;
    message.value = { id: counter, kind, text };
  }

  function clear(): void {
    message.value = null;
  }

  return { message, show, clear };
};
