import { useState } from 'react';

const SearchSection = ({ onAddChannel }) => {
  const [channelInput, setChannelInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!channelInput.trim()) return;

    setIsLoading(true);
    try {
      // TODO: Implement channel addition logic
      await onAddChannel(channelInput.trim());
      setChannelInput('');
    } catch (error) {
      console.error('チャンネル追加エラー:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="card mb-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        チャンネル検索・追加
      </h2>
      <form onSubmit={handleSubmit} className="flex gap-4">
        <input
          type="text"
          value={channelInput}
          onChange={(e) => setChannelInput(e.target.value)}
          placeholder="チャンネルURL または チャンネルID を入力"
          className="input-field flex-1"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !channelInput.trim()}
          className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              分析中...
            </>
          ) : (
            <>
              📊 分析追加
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default SearchSection;