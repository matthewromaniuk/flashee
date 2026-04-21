import React, { useState } from 'react';
import { Card, Button } from 'antd';
import {
  LeftOutlined,
  RightOutlined,
  SyncOutlined,
  EditOutlined,
  CheckOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import './Flashcard.css';

const Flashcard = ({
  frontContent,
  backContent,
  onPrevious,
  onNext,
  onEdit,
  onMarkCorrect,
  onMarkIncorrect,
  height = 220,
}) => {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handlePrevious = () => {
    setIsFlipped(false);
    if (onPrevious) {
      onPrevious();
    }
  };

  const handleNext = () => {
    setIsFlipped(false);
    if (onNext) {
      onNext();
    }
  };

  const actions = [
    <LeftOutlined key="left" onClick={handlePrevious} />,
    <SyncOutlined key="flip" onClick={handleFlip} />,
    <RightOutlined key="right" onClick={handleNext} />,
  ];

  if (onEdit) {
    actions.push(<EditOutlined key="edit" onClick={onEdit} />);
  }

  if (onMarkCorrect) {
    actions.push(<CheckOutlined key="correct" onClick={onMarkCorrect} />);
  }

  if (onMarkIncorrect) {
    actions.push(<CloseOutlined key="incorrect" onClick={onMarkIncorrect} />);
  }

  return (
    <div className="flashcard-container" style={{ width: '100%' }}>
      <div 
        className={`flashcard ${isFlipped ? 'flipped' : ''}`}
        style={{ height }}
      >
        <div className="flashcard-front">
          <Card 
            style={{ width: '100%', height: '100%' }}
            actions={actions}
          >
            {frontContent}
          </Card>
        </div>
        <div className="flashcard-back">
          <Card 
            style={{ width: '100%', height: '100%' }}
            actions={actions}
          >
            {backContent}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Flashcard;