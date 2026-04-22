import { Button, Card, Tag, Typography } from 'antd'
import { FolderOpenOutlined } from '@ant-design/icons'

const { Title, Text } = Typography

const CardsetBubble = ({ cardset, onClick, onMoveToCourse, courseName }) => {
  return (
    <Card
      hoverable
      onClick={onClick}
      style={{
        borderRadius: 20,
        minHeight: 150,
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <Title level={4} style={{ marginBottom: 8 }}>
        {cardset?.name ?? 'Untitled Deck'}
      </Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
        {cardset?.security ?? 'Private'}
      </Text>
      {courseName ? (
        <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
          Course: {courseName}
        </Text>
      ) : null}
      {cardset?.role ? <Tag color="blue">{cardset.role}</Tag> : null}
      {onMoveToCourse ? (
        <div style={{ marginTop: 12 }}>
          <Button
            size="small"
            icon={<FolderOpenOutlined />}
            onClick={(event) => {
              event.stopPropagation()
              onMoveToCourse(cardset)
            }}
          >
            Move to Course
          </Button>
        </div>
      ) : null}
    </Card>
  )
}

export default CardsetBubble
