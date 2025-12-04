import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';

interface BusSearchProps {
  onSearch: (route: string) => void;
  isLoading: boolean;
}

export function BusSearch({ onSearch, isLoading }: BusSearchProps) {
  const [route, setRoute] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (route.trim()) {
      onSearch(route.trim().toUpperCase());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-3">
      <Input
        type="text"
        placeholder="輸入巴士路線（例如：1A、68X）"
        value={route}
        onChange={(e) => setRoute(e.target.value)}
        className="flex-1 text-lg h-12"
      />
      <Button type="submit" disabled={isLoading || !route.trim()} className="h-12 px-6">
        <Search className="w-5 h-5 mr-2" />
        搜尋
      </Button>
    </form>
  );
}
