import React, { useEffect } from 'react'
import { Box, Text, VStack, HStack, Badge, Button, useColorModeValue } from '@chakra-ui/react'

function MainApp(): JSX.Element {
  useEffect(() => {
    // Set document title for main window
    document.title = 'Knowlex Desktop'
  }, [])
  const bgColor = useColorModeValue('gray.50', 'gray.900')
  const cardBg = useColorModeValue('white', 'gray.800')

  return (
    <Box minH="100vh" bg={bgColor}>
      {/* Header */}
      <Box bg={cardBg} shadow="sm" px={6} py={4}>
        <HStack justify="space-between" align="center">
          <HStack spacing={3}>
            <Text fontSize="2xl" fontWeight="bold" color="blue.600">
              Knowlex
            </Text>
            <Badge colorScheme="green" variant="subtle">
              Desktop
            </Badge>
          </HStack>

          <HStack spacing={3}>
            <Button size="sm" variant="ghost">
              设置
            </Button>
            <Button size="sm" colorScheme="blue">
              新建对话
            </Button>
          </HStack>
        </HStack>
      </Box>

      {/* Main Content */}
      <Box p={6}>
        <VStack spacing={8} maxW="800px" mx="auto">
          {/* Welcome Section */}
          <Box textAlign="center" py={12}>
            <Text fontSize="4xl" fontWeight="bold" mb={4}>
              欢迎使用 Knowlex 桌面智能助理
            </Text>
            <Text fontSize="lg" color="gray.600" mb={8}>
              AI 驱动的知识管理与智能对话平台
            </Text>

            <HStack justify="center" spacing={4}>
              <Button colorScheme="blue" size="lg">
                开始对话
              </Button>
              <Button variant="outline" size="lg">
                创建项目
              </Button>
            </HStack>
          </Box>

          {/* Feature Cards */}
          <VStack spacing={6} w="full">
            <Text fontSize="2xl" fontWeight="semibold" textAlign="center">
              核心功能
            </Text>

            <HStack spacing={6} w="full" justify="center" wrap="wrap">
              <Box bg={cardBg} p={6} borderRadius="lg" shadow="md" minW="250px" textAlign="center">
                <Text fontSize="xl" fontWeight="semibold" mb={2}>
                  🤖 智能对话
                </Text>
                <Text color="gray.600" fontSize="sm">
                  与 AI 助手进行自然语言对话，获得智能回答和建议
                </Text>
              </Box>

              <Box bg={cardBg} p={6} borderRadius="lg" shadow="md" minW="250px" textAlign="center">
                <Text fontSize="xl" fontWeight="semibold" mb={2}>
                  📁 项目管理
                </Text>
                <Text color="gray.600" fontSize="sm">
                  创建和管理项目空间，组织相关的对话和文件
                </Text>
              </Box>

              <Box bg={cardBg} p={6} borderRadius="lg" shadow="md" minW="250px" textAlign="center">
                <Text fontSize="xl" fontWeight="semibold" mb={2}>
                  📄 文件处理
                </Text>
                <Text color="gray.600" fontSize="sm">
                  上传和处理文档，通过 RAG 技术增强对话体验
                </Text>
              </Box>

              <Box bg={cardBg} p={6} borderRadius="lg" shadow="md" minW="250px" textAlign="center">
                <Text fontSize="xl" fontWeight="semibold" mb={2}>
                  🧠 知识管理
                </Text>
                <Text color="gray.600" fontSize="sm">
                  保存和管理重要知识点，构建个人知识库
                </Text>
              </Box>
            </HStack>
          </VStack>

          {/* Status Section */}
          <Box bg={cardBg} p={6} borderRadius="lg" shadow="md" w="full" textAlign="center">
            <Text fontSize="lg" fontWeight="semibold" mb={4}>
              系统状态
            </Text>
            <HStack justify="center" spacing={6}>
              <VStack>
                <Badge colorScheme="green" fontSize="sm">
                  数据库
                </Badge>
                <Text fontSize="sm" color="gray.600">
                  已连接
                </Text>
              </VStack>
              <VStack>
                <Badge colorScheme="green" fontSize="sm">
                  IPC 通信
                </Badge>
                <Text fontSize="sm" color="gray.600">
                  正常
                </Text>
              </VStack>
              <VStack>
                <Badge colorScheme="blue" fontSize="sm">
                  向量搜索
                </Badge>
                <Text fontSize="sm" color="gray.600">
                  就绪
                </Text>
              </VStack>
            </HStack>
          </Box>
        </VStack>
      </Box>
    </Box>
  )
}

export default MainApp
