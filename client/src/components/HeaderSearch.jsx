//Search Bar Component that handles and routes search queries
import { Input } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { useLocation, useNavigate } from 'react-router-dom'

const HeaderSearch = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const query = new URLSearchParams(location.search).get('q') ?? ''

  const onSearch = (value) => {
    const trimmedValue = value.trim()
    if (!trimmedValue) {
      return
    }

    navigate(`/search?q=${encodeURIComponent(trimmedValue)}`)
  }

  return (
    <Input.Search
      placeholder="Search decks or courses"
      allowClear
      enterButton={<SearchOutlined />}
      defaultValue={query}
      onSearch={onSearch}
      style={{ maxWidth: 420, width: '100%' }}
    />
  )
}

export default HeaderSearch
