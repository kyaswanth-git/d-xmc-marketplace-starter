'use client';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Location } from './types';

interface LocationListProps {
  locations: Location[];
  editingLocationId: string | null;
  onEdit: (location: Location) => void;
  onDelete: (id: string) => void;
  onReorder: (locations: Location[]) => void;
}

function SortableItem({
  location,
  isEditing,
  onEdit,
  onDelete,
}: {
  location: Location;
  isEditing: boolean;
  onEdit: (location: Location) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: location.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    padding: '10px 8px',
    borderBottom: '1px solid #eee',
    borderLeft: isEditing ? '3px solid #eb1f1f' : '3px solid transparent',
    background: isEditing ? '#fff5f5' : '#fff',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      {/* Drag handle */}
      <span
        {...listeners}
        style={{
          cursor: 'grab',
          fontSize: '1.1rem',
          color: '#999',
          userSelect: 'none',
          paddingTop: 2,
        }}
        title="Drag to reorder"
      >
        ⠿
      </span>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: '0.85rem', fontFamily: 'sans-serif' }}>
          {location.label}
        </div>
        {location.address && (
          <div
            style={{
              fontSize: '0.75rem',
              color: '#888',
              marginTop: 2,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              fontFamily: 'sans-serif',
            }}
          >
            {location.address}
          </div>
        )}
        <div
          style={{
            fontSize: '0.7rem',
            color: '#aaa',
            marginTop: 2,
            fontFamily: 'monospace',
          }}
        >
          {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
        </div>
      </div>

      {/* Actions */}
      <button
        onClick={() => onEdit(location)}
        style={actionBtnStyle}
        title="Edit"
        type="button"
      >
        ✏️
      </button>
      <button
        onClick={() => onDelete(location.id)}
        style={{ ...actionBtnStyle, color: '#eb1f1f' }}
        title="Delete"
        type="button"
      >
        ✕
      </button>
    </div>
  );
}

export default function LocationList({
  locations,
  editingLocationId,
  onEdit,
  onDelete,
  onReorder,
}: LocationListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = locations.findIndex((l) => l.id === active.id);
    const newIndex = locations.findIndex((l) => l.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    onReorder(arrayMove(locations, oldIndex, newIndex));
  };

  return (
    <div style={{ marginTop: 12 }}>
      <div
        style={{
          fontWeight: 600,
          fontSize: '0.85rem',
          marginBottom: 6,
          fontFamily: 'sans-serif',
        }}
      >
        Added Locations ({locations.length})
      </div>

      {locations.length === 0 ? (
        <div
          style={{
            fontSize: '0.8rem',
            color: '#999',
            padding: '12px 0',
            fontFamily: 'sans-serif',
          }}
        >
          No locations added yet. Click on the map or search to get started.
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={locations.map((l) => l.id)}
            strategy={verticalListSortingStrategy}
          >
            {locations.map((loc) => (
              <SortableItem
                key={loc.id}
                location={loc}
                isEditing={editingLocationId === loc.id}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

const actionBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: '2px 4px',
  fontSize: '0.9rem',
};
