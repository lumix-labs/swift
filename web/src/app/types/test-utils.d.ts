// Add Jest DOM matchers to TypeScript
import "@testing-library/jest-dom";

declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveTextContent(text: string): R;
      toBeInTheDocument(): R;
      toBeVisible(): R;
      toContainElement(element: HTMLElement | null): R;
      toHaveAttribute(attr: string, value?: string): R;
      toHaveClass(className: string): R;
      toHaveStyle(style: Record<string, any>): R;
      toBeDisabled(): R;
      toBeEnabled(): R;
      toBeRequired(): R;
      toBeInvalid(): R;
      toBeValid(): R;
    }
  }
}
