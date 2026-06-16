'use client';

import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Alert,
  Button,
} from '@mui/material';
import {
  TrendingUp,
  Warning,
  CheckCircle,
  Lightbulb,
  BugReport,
  ExpandMore,
  AutoFixHigh,
  Insights,
  Speed,
  Refresh,
} from '@mui/icons-material';
import { GaugeChart } from '../charts';

interface AIInsight {
  id: string;
  type: 'prediction' | 'recommendation' | 'warning' | 'anomaly';
  title: string;
  description: string;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  actions?: string[];
}

interface FlakyTest {
  name: string;
  failureRate: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  lastFailure: string;
  suggestion: string;
}

interface AIInsightsPanelProps {
  insights: AIInsight[];
  flakyTests: FlakyTest[];
  predictions: {
    nextFailureRate: number;
    passRatePrediction: number;
    recommendedRetries: number;
  };
  loading?: boolean;
  onRefresh?: () => void;
}

export function AIInsightsPanel({
  insights,
  flakyTests,
  predictions,
  loading: _loading,
  onRefresh,
}: AIInsightsPanelProps) {
  const getInsightIcon = (type: AIInsight['type']) => {
    switch (type) {
      case 'prediction':
        return <TrendingUp />;
      case 'recommendation':
        return <Lightbulb />;
      case 'warning':
        return <Warning />;
      case 'anomaly':
        return <BugReport />;
      default:
        return <Insights />;
    }
  };

  const getImpactColor = (impact: AIInsight['impact']) => {
    switch (impact) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      default:
        return 'default';
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={600} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AutoFixHigh color="primary" />
          AI Insights
        </Typography>
        {onRefresh && (
          <Button startIcon={<Refresh />} onClick={onRefresh} size="small">
            Refresh
          </Button>
        )}
      </Box>

      <Grid container spacing={3}>
        {/* Predictions */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardHeader
              title="Predictions"
              avatar={<Speed color="primary" />}
            />
            <CardContent sx={{ textAlign: 'center' }}>
              <Box sx={{ mb: 2 }}>
                <GaugeChart
                  value={predictions.passRatePrediction}
                  label="Pass Rate"
                  color="#10b981"
                />
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Predicted Failure Rate
                </Typography>
                <Typography variant="h5" fontWeight={600}>
                  {predictions.nextFailureRate.toFixed(1)}%
                </Typography>
              </Box>
              <Alert severity="info" sx={{ mt: 2 }}>
                Recommended retries: {predictions.recommendedRetries}
              </Alert>
            </CardContent>
          </Card>
        </Grid>

        {/* Active Insights */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardHeader
              title="Active Insights"
              subheader={`${insights.length} new insights detected`}
            />
            <CardContent>
              {insights.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <CheckCircle color="success" sx={{ fontSize: 48, mb: 2 }} />
                  <Typography>No active insights. Your tests are performing well!</Typography>
                </Box>
              ) : (
                <List>
                  {insights.map((insight) => (
                    <ListItem
                      key={insight.id}
                      sx={{
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        mb: 1,
                      }}
                    >
                      <ListItemIcon>{getInsightIcon(insight.type)}</ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {insight.title}
                            <Chip
                              label={insight.impact}
                              size="small"
                              color={getImpactColor(insight.impact)}
                            />
                          </Box>
                        }
                        secondary={
                          <>
                            <Typography variant="body2" color="text.secondary">
                              {insight.description}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                              <Typography variant="caption">Confidence:</Typography>
                              <LinearProgress
                                variant="determinate"
                                value={insight.confidence}
                                sx={{ flex: 1, maxWidth: 100, height: 4 }}
                              />
                              <Typography variant="caption">{insight.confidence}%</Typography>
                            </Box>
                          </>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Flaky Tests */}
        <Grid item xs={12}>
          <Card>
            <CardHeader
              title="Flaky Tests Analysis"
              subheader="Tests with inconsistent behavior"
            />
            <CardContent>
              {flakyTests.length === 0 ? (
                <Alert severity="success">No flaky tests detected!</Alert>
              ) : (
                <Accordion defaultExpanded>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Warning color="warning" />
                      <Typography>
                        {flakyTests.length} Flaky Tests Detected
                      </Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <List>
                      {flakyTests.map((test, index) => (
                        <ListItem
                          key={index}
                          sx={{
                            border: '1px solid',
                            borderColor: 'warning.light',
                            borderRadius: 1,
                            mb: 1,
                            bgcolor: 'warning.light',
                          }}
                        >
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography fontWeight={600}>{test.name}</Typography>
                                <Chip
                                  label={`${test.failureRate}% failure rate`}
                                  size="small"
                                  color="warning"
                                />
                                <Chip
                                  icon={test.trend === 'increasing' ? <TrendingUp /> : undefined}
                                  label={test.trend}
                                  size="small"
                                  variant="outlined"
                                />
                              </Box>
                            }
                            secondary={
                              <>
                                <Typography variant="body2" color="text.secondary">
                                  Last failure: {test.lastFailure}
                                </Typography>
                                <Alert severity="info" sx={{ mt: 1 }}>
                                  💡 {test.suggestion}
                                </Alert>
                              </>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  </AccordionDetails>
                </Accordion>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recommendations */}
        <Grid item xs={12}>
          <Card>
            <CardHeader
              title="AI Recommendations"
              avatar={<Lightbulb color="primary" />}
            />
            <CardContent>
              <Grid container spacing={2}>
                {[
                  { title: 'Increase test coverage', description: 'Add tests for edge cases in payment flow', priority: 'high' },
                  { title: 'Fix flaky test', description: 'OAuth login test has 28% failure rate', priority: 'medium' },
                  { title: 'Optimize execution', description: 'Parallelize independent API tests', priority: 'low' },
                ].map((rec, index) => (
                  <Grid item xs={12} md={4} key={index}>
                    <Box
                      sx={{
                        p: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 2,
                        height: '100%',
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography fontWeight={600}>{rec.title}</Typography>
                        <Chip
                          label={rec.priority}
                          size="small"
                          color={rec.priority === 'high' ? 'error' : rec.priority === 'medium' ? 'warning' : 'default'}
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {rec.description}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export default AIInsightsPanel;