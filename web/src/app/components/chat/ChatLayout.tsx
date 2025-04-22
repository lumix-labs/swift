import { Header } from '../ui/Header';
import { Footer } from '../ui/Footer';
import { ChatMessageList } from './ChatMessageList';
import { ChatInput } from './ChatInput';

export function ChatLayout() {
  return (
    <div className="flex flex-col h-screen bg-white dark:bg-black text-black dark:text-white">
      <Header />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <ChatMessageList />
        
        <div className="p-4 flex justify-center items-center border-t border-gray-200 dark:border-gray-800">
          <ChatInput />
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
