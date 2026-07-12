"use client"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  CheckCircle,
  Clock,
  Database,
  Pause,
  Play,
  RefreshCw,
  Settings,
  TrendingUp,
  Wifi,
  WifiOff,
  Zap,
} from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts"

// 实时数据处理引擎
interface ProcessingMetrics {
  totalProcessed: number
  processingRate: number
  errorRate: number
  latency: number
}

interface AlertCondition {
  threshold: number
  type: "high" | "low"
  message: string
}

interface AlertInfo {
  id: string
  streamId: string
  message: string
  value: number
  threshold: number
  timestamp: number
  severity: string
}

interface StreamDataPoint {
  streamId: string
  value: number
  timestamp: number
  transformations?: Array<{ type: string;[key: string]: unknown }>
}

class RealTimeDataProcessorEngine {
  private subscribers: Map<string, Set<(data: StreamDataPoint) => void>> = new Map()
  private dataStreams: Map<string, unknown> = new Map()
  private processingQueue: StreamDataPoint[] = []
  private isProcessing = false
  private metrics: ProcessingMetrics = {
    totalProcessed: 0,
    processingRate: 0,
    errorRate: 0,
    latency: 0,
  }

  // 订阅数据流
  subscribe(streamId: string, callback: (data: StreamDataPoint) => void): () => void {
    if (!this.subscribers.has(streamId)) {
      this.subscribers.set(streamId, new Set())
    }
    this.subscribers.get(streamId)!.add(callback)

    return () => {
      const callbacks = this.subscribers.get(streamId)
      if (callbacks) {
        callbacks.delete(callback)
        if (callbacks.size === 0) {
          this.subscribers.delete(streamId)
        }
      }
    }
  }

  // 发布数据
  publish(streamId: string, data: StreamDataPoint): void {
    const callbacks = this.subscribers.get(streamId)
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(data)
        } catch (error) {
          console.error(`Error in subscriber callback for ${streamId}:`, error)
        }
      })
    }
  }

  // 添加数据到处理队列
  addToQueue(data: StreamDataPoint): void {
    this.processingQueue.push({
      ...data,
      timestamp: Date.now(),
    })

    if (!this.isProcessing) {
      this.processQueue()
    }
  }

  // 处理队列中的数据
  async processQueue(): Promise<void> {
    if (this.processingQueue.length === 0) {
      this.isProcessing = false
      return
    }

    this.isProcessing = true
    const startTime = Date.now()

    while (this.processingQueue.length > 0) {
      const data = this.processingQueue.shift()
      if (!data) continue

      try {
        const processedData = await this.processData(data)
        this.publish(data.streamId, processedData)
        this.metrics.totalProcessed++
      } catch (error) {
        console.error("Data processing error:", error)
        this.metrics.errorRate++
      }
    }

    const endTime = Date.now()
    this.metrics.latency = endTime - startTime
    this.metrics.processingRate = this.metrics.totalProcessed / ((endTime - startTime) / 1000)

    this.isProcessing = false
  }

  // 数据处理逻辑
  async processData(data: StreamDataPoint): Promise<StreamDataPoint & { processed: boolean; processedAt: number }> {
    // 模拟数据处理延迟
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 10))

    const processed = {
      ...data,
      processed: true,
      processedAt: Date.now(),
      value: this.applyTransformations(data.value, data.transformations || []),
    }

    return processed
  }

  // 应用数据转换
  applyTransformations(value: number, transformations: Array<{ type: string;[key: string]: unknown }>): number {
    return transformations.reduce((acc: number, transform: { type: string;[key: string]: unknown }) => {
      switch (transform.type) {
        case "multiply":
          return acc * (transform.factor as number)
        case "add":
          return acc + (transform.value as number)
        case "round":
          return Math.round(acc * Math.pow(10, transform.decimals as number)) / Math.pow(10, transform.decimals as number)
        case "filter":
          return (transform.condition as (v: number) => boolean)(acc) ? acc : 0
        default:
          return acc
      }
    }, value)
  }

  // 获取处理指标
  getMetrics(): ProcessingMetrics {
    return { ...this.metrics }
  }

  // 获取队列长度
  getQueueLength(): number {
    return this.processingQueue.length
  }

  // 获取处理状态
  getIsProcessing(): boolean {
    return this.isProcessing
  }

  // 重置指标
  resetMetrics(): void {
    this.metrics = {
      totalProcessed: 0,
      processingRate: 0,
      errorRate: 0,
      latency: 0,
    }
  }
}

// 数据流生成器
interface StreamConfig {
  type: string
  initialValue?: number
  interval?: number
  transformations?: Array<{ type: string;[key: string]: unknown }>
  [key: string]: unknown
}

interface StreamState {
  isActive: boolean
  lastValue: number
  [key: string]: unknown
}

class DataStreamGenerator {
  private streams: Map<string, StreamState> = new Map()
  private intervals: Map<string, ReturnType<typeof setInterval>> = new Map()

  // 创建数据流
  createStream(streamId: string, config: StreamConfig): void {
    const stream = {
      ...config,
      isActive: false,
      lastValue: (config.initialValue as number) || 0,
    }
    this.streams.set(streamId, stream as unknown as StreamState)
  }

  // 启动数据流
  startStream(streamId: string, processor: RealTimeDataProcessorEngine): void {
    const stream = this.streams.get(streamId)
    if (!stream || stream.isActive) return

    stream.isActive = true
    this.streams.set(streamId, stream)

    const interval = setInterval(() => {
      if (!stream.isActive) {
        clearInterval(interval)
        return
      }

      const newValue = this.generateValue(stream)
      stream.lastValue = newValue

      processor.addToQueue({
        streamId,
        value: newValue,
        timestamp: Date.now(),
        transformations: stream.transformations as Array<{ type: string;[key: string]: unknown }> | undefined,
      })
    }, (stream.interval as number) || 1000)

    this.intervals.set(streamId, interval)
  }

  // 停止数据流
  stopStream(streamId: string): void {
    const stream = this.streams.get(streamId)
    if (stream) {
      stream.isActive = false
      this.streams.set(streamId, stream)
    }

    const interval = this.intervals.get(streamId)
    if (interval) {
      clearInterval(interval)
      this.intervals.delete(streamId)
    }
  }

  // 生成数据值
  private generateValue(stream: StreamState): number {
    switch (stream.type) {
      case "random":
        return Math.random() * ((stream.max as number) - (stream.min as number)) + (stream.min as number)
      case "sine":
        return Math.sin(Date.now() / (stream.period as number)) * (stream.amplitude as number) + (stream.offset as number)
      case "trend":
        return stream.lastValue + (Math.random() - 0.5) * (stream.volatility as number) + (stream.trend as number)
      case "step":
        return Math.floor(Math.random() * (stream.steps as number)) * (stream.stepSize as number) + (stream.min as number)
      default:
        return Math.random() * 100
    }
  }

  // 获取流状态
  getStreamStatus(streamId: string): StreamState | undefined {
    return this.streams.get(streamId)
  }

  // 获取所有流
  getAllStreams(): Array<{ id: string } & Record<string, unknown>> {
    return Array.from(this.streams.entries()).map(([id, stream]) => ({
      id,
      ...stream,
    }))
  }
}

// 实时数据可视化组件
function RealTimeChart({
  data,
  type = "line",
  title,
  color = "#3b82f6",
}: {
  data: Array<{ timestamp: number; value: number }>
  type?: string
  title: string
  color?: string
}) {
  const chartData = data.slice(-50) as Array<{ timestamp: number; value: number | string }>

  const renderChart = () => {
    switch (type) {
      case "area":
        return (
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="timestamp" tickFormatter={(value: number) => new Date(value).toLocaleTimeString()} />
            <YAxis />
            <Tooltip
              labelFormatter={(value: number) => new Date(value).toLocaleString()}
              formatter={(value: number) => [Number(value).toFixed(2), title]}
            />
            <Area type="monotone" dataKey="value" stroke={color} fill={color} fillOpacity={0.3} />
          </AreaChart>
        )
      case "bar":
        return (
          <BarChart data={chartData.slice(-10)}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="timestamp" tickFormatter={(value: number) => new Date(value).toLocaleTimeString()} />
            <YAxis />
            <Tooltip
              labelFormatter={(value: number) => new Date(value).toLocaleString()}
              formatter={(value: number) => [Number(value).toFixed(2), title]}
            />
            <Bar dataKey="value" fill={color} />
          </BarChart>
        )
      default:
        return (
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="timestamp" tickFormatter={(value: number) => new Date(value).toLocaleTimeString()} />
            <YAxis />
            <Tooltip
              labelFormatter={(value: number) => new Date(value).toLocaleString()}
              formatter={(value: number) => [Number(value).toFixed(2), title]}
            />
            <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          </LineChart>
        )
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <span>{title}</span>
          <Badge variant="outline" className="text-xs">
            实时
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          {renderChart()}
        </ResponsiveContainer>

        {/* 当前值显示 */}
        <div className="mt-2 flex items-center justify-between text-sm">
          <span className="text-gray-600">当前值:</span>
          <span className="font-mono font-bold" style={{ color }}>
            {data.length > 0 ? Number(data[data.length - 1]?.value).toFixed(2) : "0.00"}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

// 主要的实时数据处理组件
export function RealTimeDataProcessor() {
  const [processor] = useState(() => new RealTimeDataProcessorEngine())
  const [generator] = useState(() => new DataStreamGenerator())
  const [isConnected, setIsConnected] = useState(true)
  const [activeStreams, setActiveStreams] = useState<Set<string>>(new Set())
  const [streamData, setStreamData] = useState<Map<string, Array<{ timestamp: number; value: number }>>>(new Map())
  const [metrics, setMetrics] = useState(processor.getMetrics())
  const [alerts, setAlerts] = useState<AlertInfo[]>([])
  const [selectedTimeRange, setSelectedTimeRange] = useState("1m")

  // 初始化数据流
  useEffect(() => {
    // 创建不同类型的数据流
    generator.createStream("sales", {
      type: "trend",
      initialValue: 1000,
      trend: 0.1,
      volatility: 50,
      interval: 1000,
      transformations: [{ type: "round", decimals: 2 }],
    })

    generator.createStream("users", {
      type: "sine",
      amplitude: 20,
      offset: 100,
      period: 10000,
      interval: 500,
      transformations: [{ type: "round", decimals: 0 }],
    })

    generator.createStream("performance", {
      type: "random",
      min: 70,
      max: 100,
      interval: 2000,
      transformations: [{ type: "round", decimals: 1 }],
    })

    generator.createStream("errors", {
      type: "step",
      min: 0,
      max: 10,
      steps: 11,
      stepSize: 1,
      interval: 3000,
    })

    // 订阅数据流
    const unsubscribers: Array<() => void> = []
    const streamIds: string[] = ["sales", "users", "performance", "errors"]
    streamIds.forEach((streamId) => {
      const unsubscribe = processor.subscribe(streamId, (data) => {
        setStreamData((prev) => {
          const newMap = new Map(prev)
          const currentData = newMap.get(streamId) || []
          const updatedData = [...currentData, { timestamp: data.timestamp, value: data.value }].slice(-100)
          newMap.set(streamId, updatedData)
          return newMap
        })

        // 检查告警条件
        checkAlerts(streamId, data)
      })
      unsubscribers.push(unsubscribe)
    })

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe())
      streamIds.forEach((streamId) => generator.stopStream(streamId))
    }
  }, [])

  // 更新指标
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(processor.getMetrics())
    }, 1000)

    return () => clearInterval(interval)
  }, [processor])

  // 检查告警
  const checkAlerts = useCallback((streamId: string, data: StreamDataPoint) => {
    const alertConditions: Record<string, AlertCondition> = {
      sales: { threshold: 1200, type: "high", message: "销售额异常高" },
      users: { threshold: 80, type: "low", message: "用户活跃度低" },
      performance: { threshold: 75, type: "low", message: "系统性能下降" },
      errors: { threshold: 5, type: "high", message: "错误率过高" },
    }

    const condition = alertConditions[streamId]
    if (!condition) return

    const shouldAlert = condition.type === "high" ? data.value > condition.threshold : data.value < condition.threshold

    if (shouldAlert) {
      const alert: AlertInfo = {
        id: `alert_${Date.now()}`,
        streamId,
        message: condition.message,
        value: data.value,
        threshold: condition.threshold,
        timestamp: Date.now(),
        severity: data.value > condition.threshold * 1.5 || data.value < condition.threshold * 0.5 ? "high" : "medium",
      }

      setAlerts((prev) => [alert, ...prev.slice(0, 9)])
    }
  }, [])

  // 启动/停止数据流
  const toggleStream = (streamId: string) => {
    if (activeStreams.has(streamId)) {
      generator.stopStream(streamId)
      setActiveStreams((prev) => {
        const newSet = new Set(prev)
        newSet.delete(streamId)
        return newSet
      })
    } else {
      generator.startStream(streamId, processor)
      setActiveStreams((prev) => new Set([...prev, streamId]))
    }
  }

  // 清除告警
  const clearAlert = (alertId: string) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== alertId))
  }

  // 重置所有数据
  const resetAllData = () => {
    setStreamData(new Map())
    setAlerts([])
    processor.resetMetrics()
    setMetrics(processor.getMetrics())
  }

  return (
    <div className="space-y-6">
      {/* 页面标题和控制 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">实时数据处理中心</h1>
          <p className="text-gray-600 mt-1">高性能实时数据流处理和分析</p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            {isConnected ? <Wifi className="w-4 h-4 text-green-500" /> : <WifiOff className="w-4 h-4 text-red-500" />}
            <span className={`text-sm ${isConnected ? "text-green-600" : "text-red-600"}`}>
              {isConnected ? "已连接" : "连接断开"}
            </span>
          </div>

          <Button variant="outline" size="sm" onClick={resetAllData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            重置
          </Button>

          <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30s">30秒</SelectItem>
              <SelectItem value="1m">1分钟</SelectItem>
              <SelectItem value="5m">5分钟</SelectItem>
              <SelectItem value="15m">15分钟</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 系统状态和指标 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-400">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">处理总数</p>
                <p className="text-2xl font-bold text-blue-600">{metrics.totalProcessed}</p>
                <p className="text-xs text-gray-500 mt-1">累计处理</p>
              </div>
              <Database className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-400">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">处理速率</p>
                <p className="text-2xl font-bold text-green-600">{metrics.processingRate.toFixed(1)}/s</p>
                <p className="text-xs text-gray-500 mt-1">每秒处理</p>
              </div>
              <Zap className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-400">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">平均延迟</p>
                <p className="text-2xl font-bold text-yellow-600">{metrics.latency}ms</p>
                <p className="text-xs text-gray-500 mt-1">处理延迟</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-400">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">错误数量</p>
                <p className="text-2xl font-bold text-red-600">{metrics.errorRate}</p>
                <p className="text-xs text-gray-500 mt-1">处理错误</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 告警面板 */}
      {alerts.length > 0 && (
        <Card className="border-l-4 border-l-orange-400">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Bell className="w-5 h-5 text-orange-500" />
              <span>实时告警</span>
              <Badge variant="destructive">{alerts.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {alerts.map((alert) => (
                <Alert
                  key={alert.id}
                  className={`${alert.severity === "high" ? "border-red-200 bg-red-50" : "border-yellow-200 bg-yellow-50"}`}
                >
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription className="flex items-center justify-between">
                    <div>
                      <strong>{alert.message}</strong>
                      <span className="ml-2 text-sm">
                        当前值: {alert.value.toFixed(2)} (阈值: {alert.threshold})
                      </span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => clearAlert(alert.id)}>
                      ×
                    </Button>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 数据流控制面板 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="w-5 h-5" />
            <span>数据流控制</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {["sales", "users", "performance", "errors"].map((streamId: string) => {
              const isActive = activeStreams.has(streamId)
              const streamInfoMap: Record<string, { name: string; icon: React.ElementType; color: string }> = {
                sales: { name: "销售数据", icon: TrendingUp, color: "text-blue-600" },
                users: { name: "用户活跃", icon: Activity, color: "text-green-600" },
                performance: { name: "系统性能", icon: BarChart3, color: "text-purple-600" },
                errors: { name: "错误监控", icon: AlertTriangle, color: "text-red-600" },
              }
              const streamInfo = streamInfoMap[streamId]

              return (
                <Card
                  key={streamId}
                  className={`border-2 ${isActive ? "border-green-200 bg-green-50" : "border-gray-200"}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <streamInfo.icon className={`w-5 h-5 ${streamInfo.color}`} />
                        <span className="font-medium">{streamInfo.name}</span>
                      </div>
                      <Badge variant={isActive ? "default" : "secondary"}>{isActive ? "运行中" : "已停止"}</Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">数据点: {streamData.get(streamId)?.length || 0}</div>
                      <Button
                        size="sm"
                        variant={isActive ? "destructive" : "default"}
                        onClick={() => toggleStream(streamId)}
                      >
                        {isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* 实时图表 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RealTimeChart data={streamData.get("sales") || []} type="line" title="销售数据趋势" color="#3b82f6" />

        <RealTimeChart data={streamData.get("users") || []} type="area" title="用户活跃度" color="#10b981" />

        <RealTimeChart data={streamData.get("performance") || []} type="line" title="系统性能监控" color="#8b5cf6" />

        <RealTimeChart data={streamData.get("errors") || []} type="bar" title="错误统计" color="#ef4444" />
      </div>

      {/* 数据处理队列状态 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5" />
            <span>处理队列状态</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">队列长度:</span>
              <Badge variant="outline">{processor.getQueueLength()}</Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">处理状态:</span>
              <Badge className={processor.getIsProcessing() ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                {processor.getIsProcessing() ? (
                  <>
                    <Activity className="w-3 h-3 mr-1 animate-pulse" />
                    处理中
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-3 h-3 mr-1" />
                    空闲
                  </>
                )}
              </Badge>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">处理进度:</span>
                <span className="text-sm text-gray-600">{metrics.totalProcessed > 0 ? "100%" : "0%"}</span>
              </div>
              <Progress value={processor.getIsProcessing() ? 75 : 100} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
