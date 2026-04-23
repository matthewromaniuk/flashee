//Flashcard component that displays front and back content, allows users to navigate between and flip flashcards
import { useState } from 'react';
import { Card } from 'antd';
import {
  LeftOutlined,
  RightOutlined,
  SyncOutlined,
  EditOutlined,
  CheckOutlined,
  CloseOutlined,
} from '@ant-design/icons';

const containerStyle = {
  width: '100%',
  perspective: 1000,
};

const cardStageStyle = {
  width: '100%',
  position: 'relative',
  transition: 'transform 0.6s',
  transformStyle: 'preserve-3d',
};

const cardFaceStyle = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  backfaceVisibility: 'hidden',
  WebkitBackfaceVisibility: 'hidden',
};

const cardBackStyle = {
  ...cardFaceStyle,
  transform: 'rotateY(180deg)',
};

const cardStyle = {
  width: '100%',
  height: '100%',
};

const cardBodyStyle = {
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  textAlign: 'center',
};

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
    <div style={containerStyle}>
      <div
        style={{
          ...cardStageStyle,
          height,
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        <div style={cardFaceStyle}>
          <Card
            style={cardStyle}
            bodyStyle={cardBodyStyle}
            actions={actions}
          >
            {frontContent}
          </Card>
        </div>
        <div style={cardBackStyle}>
          <Card
            style={cardStyle}
            bodyStyle={cardBodyStyle}
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
