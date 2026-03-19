import React, { useState } from 'react';
import { Card, Button } from 'antd';
import { LeftOutlined, RightOutlined, SyncOutlined } from '@ant-design/icons';
import './flashcard.css';

const Flashcard = ({ frontContent, backContent }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

const actions = [
  <LeftOutlined key="left"/>,
  <SyncOutlined key="flip" onClick={handleFlip}/>,
  <RightOutlined key="right" />
]

  return (
    <div className="flashcard-container">
      <div 
        className={`flashcard ${isFlipped ? 'flipped' : ''}`}
      >
        <div className="flashcard-front">
          <Card 
            style={{ width: 300, height: 200 }}
            actions={actions}
          >
            {frontContent}
          </Card>
        </div>
        <div className="flashcard-back">
          <Card 
            style={{ width: 300, height: 200 }}
            actions={actions}
          >
            {backContent}
          </Card>
        </div>
      </div>
    </div>
  );
};

// Usage
const flashcard = () => (
  <Flashcard 
    frontContent={
      <>
        <h3>Question</h3>
      </>
    }
    backContent={
      <>
        <p>answer</p>
      </>
    }
  />
);

export default flashcard;