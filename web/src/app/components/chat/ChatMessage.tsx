import { Message } from '../../context/ChatContext';
import { formatTimestamp } from '../../lib/utils';

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  
  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div 
        className={`
          max-w-[80%] md:max-w-[70%] px-4 py-3 rounded-lg 
          ${isUser 
            ? 'bg-black text-white dark:bg-white dark:text-black rounded-tr-none' 
            : 'bg-gray-100 text-black dark:bg-gray-800 dark:text-white rounded-tl-none'
          }
        `}
      >
        <div className="text-sm whitespace-pre-wrap break-words">
          {message.content}
        </div>
        <div className={`
          text-xs mt-1 
          ${isUser 
            ? 'text-gray-300 dark:text-gray-700' 
            : 'text-gray-500 dark:text-gray-400'
          }
        `}>
          {formatTimestamp(message.timestamp)}
        </div>
      </div>
    </div>
  );
}
