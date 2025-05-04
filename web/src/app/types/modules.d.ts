declare module 'marked' {
  export function marked(src: string, options?: Record<string, unknown>): string;
  export class Renderer {
    code: (code: string, language: string, isEscaped: boolean) => string;
    blockquote: (quote: string) => string;
    html: (html: string) => string;
    heading: (text: string, level: number, raw: string) => string;
    hr: () => string;
    list: (body: string, ordered: boolean) => string;
    listitem: (text: string) => string;
    paragraph: (text: string) => string;
    table: (header: string, body: string) => string;
    tablerow: (content: string) => string;
    tablecell: (content: string, flags: {header: boolean, align: string}) => string;
    strong: (text: string) => string;
    em: (text: string) => string;
    codespan: (text: string) => string;
    br: () => string;
    del: (text: string) => string;
    link: (href: string, title: string, text: string) => string;
    image: (href: string, title: string, text: string) => string;
    text: (text: string) => string;
  }
  export const parser: Record<string, unknown>;
}

declare module 'dompurify' {
  interface DOMPurifyOptions {
    ALLOWED_TAGS?: string[];
    ALLOWED_ATTR?: string[];
    FORBID_TAGS?: string[];
    FORBID_ATTR?: string[];
    USE_PROFILES?: {
      html?: boolean;
      svg?: boolean;
      svgFilters?: boolean;
      mathMl?: boolean;
    };
    ADD_URI_SAFE_ATTR?: string[];
    ADD_TAGS?: string[];
    ADD_ATTR?: string[];
    RETURN_DOM?: boolean;
    RETURN_DOM_FRAGMENT?: boolean;
    RETURN_DOM_IMPORT?: boolean;
    WHOLE_DOCUMENT?: boolean;
    SANITIZE_DOM?: boolean;
    KEEP_CONTENT?: boolean;
    IN_PLACE?: boolean;
  }

  interface DOMPurifyHookFunction {
    (node: Node, data: Record<string, unknown>, config: Record<string, unknown>): void;
  }

  function DOMPurify(window?: Window): {
    sanitize(html: string | Node, options?: DOMPurifyOptions): string;
    addHook(entryPoint: string, hookFunction: DOMPurifyHookFunction): void;
    removeHook(entryPoint: string): void;
    removeHooks(entryPoint: string): void;
    removeAllHooks(): void;
    isValidAttribute(tag: string, attr: string, value: string): boolean;
  };

  export default DOMPurify;
}
