import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

// 가상 데이터
const initialItems = {
  available: [
    { id: 'item-1', name: 'B.F. Sword' },
    { id: 'item-2', name: 'Recurve Bow' },
    { id: 'item-3', name: 'Needlessly Large Rod' },
  ],
  champion1: [],
  champion2: [],
};

const grid = 8;

const getItemStyle = (isDragging, draggableStyle) => ({
  userSelect: 'none',
  padding: grid * 2,
  margin: `0 ${grid}px 0 0`,
  background: isDragging ? 'lightgreen' : 'grey',
  ...draggableStyle,
});

const getListStyle = isDraggingOver => ({
  background: isDraggingOver ? 'lightblue' : 'lightgrey',
  display: 'flex',
  padding: grid,
  overflow: 'auto',
});

export default function ItemDragExample() {
  const [items, setItems] = useState(initialItems);

  const onDragEnd = result => {
    const { source, destination } = result;

    // 드롭 영역 밖으로 드롭된 경우
    if (!destination) {
      return;
    }

    const sourceId = source.droppableId;
    const destId = destination.droppableId;

    // 같은 위치로 드롭된 경우
    if (sourceId === destId && source.index === destination.index) {
      return;
    }

    const sourceList = Array.from(items[sourceId]);
    const [removed] = sourceList.splice(source.index, 1);

    if (sourceId === destId) {
      // 같은 리스트 내에서 이동
      sourceList.splice(destination.index, 0, removed);
      setItems({
        ...items,
        [sourceId]: sourceList,
      });
    } else {
      // 다른 리스트로 이동 (아이템 장착)
      const destList = Array.from(items[destId]);
      destList.splice(destination.index, 0, removed);
      setItems({
        ...items,
        [sourceId]: sourceList,
        [destId]: destList,
      });
    }
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <h2>Available Items</h2>
      <Droppable droppableId="available" direction="horizontal">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            style={getListStyle(snapshot.isDraggingOver)}
            {...provided.droppableProps}
          >
            {items.available.map((item, index) => (
              <Draggable key={item.id} draggableId={item.id} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    style={getItemStyle(
                      snapshot.isDragging,
                      provided.draggableProps.style
                    )}
                  >
                    {item.name}
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      <h2>Champion 1</h2>
      <Droppable droppableId="champion1" direction="horizontal">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            style={getListStyle(snapshot.isDraggingOver)}
            {...provided.droppableProps}
          >
            {items.champion1.map((item, index) => (
              <Draggable key={item.id} draggableId={item.id} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    style={getItemStyle(
                      snapshot.isDragging,
                      provided.draggableProps.style
                    )}
                  >
                    {item.name}
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
       <h2>Champion 2</h2>
      <Droppable droppableId="champion2" direction="horizontal">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            style={getListStyle(snapshot.isDraggingOver)}
            {...provided.droppableProps}
          >
            {items.champion2.map((item, index) => (
              <Draggable key={item.id} draggableId={item.id} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    style={getItemStyle(
                      snapshot.isDragging,
                      provided.draggableProps.style
                    )}
                  >
                    {item.name}
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
