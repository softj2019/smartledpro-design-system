import { Card, CardContent } from '@softj/smartledpro-design-system';

export function ScheduleSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 bg-gray-200 rounded animate-pulse" />
            <div>
              <div className="w-48 h-6 bg-gray-200 rounded animate-pulse mb-2" />
              <div className="w-32 h-4 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
          <div className="w-16 h-6 bg-gray-200 rounded animate-pulse" />
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-200 rounded animate-pulse" />
            <div className="w-64 h-4 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-200 rounded animate-pulse" />
            <div className="w-40 h-4 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="w-48 h-4 bg-gray-200 rounded animate-pulse" />
          <div className="flex gap-2">
            <div className="w-16 h-8 bg-gray-200 rounded animate-pulse" />
            <div className="w-16 h-8 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
