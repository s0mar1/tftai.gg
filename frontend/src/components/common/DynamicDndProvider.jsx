import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

const DynamicDndProvider = ({ children }) => {
  const [DndProvider, setDndProvider] = useState(null);
  const [HTML5Backend, setHTML5Backend] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadDndDependencies = async () => {
      try {
        const [dndModule, backendModule] = await Promise.all([
          import('react-dnd'),
          import('react-dnd-html5-backend')
        ]);
        
        setDndProvider(() => dndModule.DndProvider);
        setHTML5Backend(() => backendModule.HTML5Backend);
        setLoading(false);
        console.log('DynamicDndProvider: 로딩 완료', { 
          DndProvider: !!dndModule.DndProvider, 
          HTML5Backend: !!backendModule.HTML5Backend 
        });
      } catch (err) {
        setError(err);
        setLoading(false);
      }
    };

    loadDndDependencies();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2">드래그 앤 드롭 라이브러리를 로딩 중...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 p-4">
        드래그 앤 드롭 기능을 로드하는 데 실패했습니다.
      </div>
    );
  }

  if (!DndProvider || !HTML5Backend) {
    return <div>드래그 앤 드롭 라이브러리를 초기화하는 중...</div>;
  }

  return <DndProvider backend={HTML5Backend}>{children}</DndProvider>;
};

DynamicDndProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default DynamicDndProvider;