// frontend/src/pages/summoner/components/Item.jsx

import React from 'react';
import classNames from 'classnames';

const Item = ({ item, isCompact = false }) => {
  const imgClassNames = classNames(
    // 💡 수정: "rounded-full" 제거. 아이템은 둥근 사각형이어야 함.
    {
      "w-4 h-4": !isCompact, // 기본 크기 (16x16px)
      "w-3 h-3": isCompact    // 컴팩트 크기 (12x12px)
    }
  );

  return (
    <img
      src={item.image_url}
      alt={item.name}
      className={imgClassNames} // 클래스 적용
      title={item.name}
    />
  );
};

export default Item;