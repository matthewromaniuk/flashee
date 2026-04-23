// Displays deck information in bubble format, used in workspace and search results
import { Button, Card, Tag, Typography } from 'antd'
import { SwapOutlined } from '@ant-design/icons'

const { Title, Text } = Typography

const DeckBubble = ({ deck, onClick, onMoveToCourse, courseName }) => {
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
        {deck?.name ?? 'Untitled Deck'}
      </Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
        {deck?.isPublic ? 'Public' : 'Private'}
      </Text>
      {courseName ? (
        <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
          Course: {courseName}
        </Text>
      ) : null}
      {deck?.role ? <Tag color="blue">{deck.role}</Tag> : null}
      {onMoveToCourse ? (
        <div style={{ marginTop: 12 }}>
          <Button
            size="small"
            icon={<SwapOutlined />}
            onClick={(event) => {
              event.stopPropagation()
              onMoveToCourse(deck)
            }}
          >
            Move to Course
          </Button>
        </div>
      ) : null}
    </Card>
  )
}

export default DeckBubble
