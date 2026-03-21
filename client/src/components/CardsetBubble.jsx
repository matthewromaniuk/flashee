import { Card, Tag, Typography } from 'antd'

const { Title, Text } = Typography

const CardsetBubble = ({ cardset, onClick }) => {
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
      {cardset?.role ? <Tag color="blue">{cardset.role}</Tag> : null}
    </Card>
  )
}

export default CardsetBubble
