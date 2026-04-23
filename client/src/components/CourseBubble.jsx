// Component that represents a course on the UI
import { Card, Typography } from 'antd'
import { BookOutlined } from '@ant-design/icons'

const { Title, Text } = Typography

const CourseBubble = ({ course, onClick }) => {
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
      <BookOutlined
        style={{
          position: 'absolute',
          top: 14,
          right: 14,
          fontSize: 14,
          color: 'rgba(0,0,0,0.45)',
        }}
      />
      <Title level={4} style={{ marginBottom: 8 }}>
        {course?.name ?? 'Untitled Course'}
      </Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
        {course?.description?.trim() ? course.description : 'Course'}
      </Text>
    </Card>
  )
}

export default CourseBubble
