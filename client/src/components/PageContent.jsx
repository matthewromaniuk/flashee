import { Layout } from 'antd'

const { Content } = Layout

const PageContent = ({
  children,
  background,
  borderRadius = 0,
  margin = 0,
  minHeight = '100%',
  padding = 24,
  maxWidth = 760,
  wrapperStyle = {},
  contentStyle = {},
}) => {
  return (
    <Content
      style={{
        margin,
        padding,
        minHeight,
        background,
        borderRadius,
        ...contentStyle,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth,
          margin: '0 auto',
          ...wrapperStyle,
        }}
      >
        {children}
      </div>
    </Content>
  )
}

export default PageContent
