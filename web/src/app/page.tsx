import { ChatProvider } from './context/ChatContext';
import { ChatLayout } from './components/chat/ChatLayout';

export default function Home() {
  return (
    <ChatProvider>
      <ChatLayout />
    </ChatProvider>
  );
}
