import { Card, Typography } from 'antd'
import { FolderFilled } from '@ant-design/icons'

const { Title, Text } = Typography

const FolderBubble = ({ folder, onClick }) => {
  return (
    <Card
      hoverable
      onClick={onClick}
      style={{
        borderRadius: 20,
        minHeight: 150,
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
      }}
    >
      <FolderFilled
        style={{
          position: 'absolute',
          top: 14,
          right: 14,
          fontSize: 14,
          color: 'rgba(0,0,0,0.45)',
        }}
      />
      <Title level={4} style={{ marginBottom: 8 }}>
        {folder?.name ?? 'Untitled Course'}
      </Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
        {folder?.description?.trim() ? folder.description : 'Course'}
      </Text>
    </Card>
  )
}

export default FolderBubble