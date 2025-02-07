import { Component } from 'react';
import { AppState, IAccountsAnalyticsDataItem } from 'redux/store/types';
import { connect } from 'react-redux';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Label, ResponsiveContainer, Cell } from 'recharts';

interface LabelProps {
  x: number;
  y: number;
  width: number;
  height: number;
  value: string | number;
  index: number;
  offset?: number;
}

// Separate label component for bars
const BarCustomLabel = (props: LabelProps) => {
  const { x, y, width, value } = props;
  // Ensure we have valid numbers before calculation
  if (typeof x !== 'number' || typeof width !== 'number' || typeof y !== 'number') {
    return null;
  }

  return (
    <g>
      <text
        x={x + width / 2}
        y={y - 10}
        fill='#000'
        textAnchor='middle'
        dominantBaseline='middle'
        style={{
          fontSize: '11px',
          fontWeight: 'bold',
        }}>
        {typeof value === 'number' ? value.toLocaleString() : value}$
      </text>
    </g>
  );
};

// Separate label component for line chart
const LineCustomLabel = (props: LabelProps) => {
  const { x, y, value } = props;
  // Ensure we have valid numbers before rendering
  if (typeof x !== 'number' || typeof y !== 'number') {
    return null;
  }

  return (
    <g>
      <text
        x={x}
        y={y - 15}
        fill='#000'
        textAnchor='middle'
        style={{
          fontSize: '12px',
          fontWeight: 'bold',
          background: '#fff',
        }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </text>
    </g>
  );
};

const CustomYAxisTick = (props: any) => {
  const { x, y, payload } = props;
  return (
    <text x={x} y={y} textAnchor='end' fill='#666' transform={`rotate(-45, ${x}, ${y})`}>
      {`${Number(payload.value).toLocaleString()}$`}
    </text>
  );
};

interface AccountsAnalyticsProps {
  analyticsData: IAccountsAnalyticsDataItem[];
}

class AccountsAnalytics extends Component<AccountsAnalyticsProps> {
  render() {
    const { analyticsData } = this.props;

    const chartData = analyticsData.map((item) => ({
      day: new Date(item.date).getDate(),
      totalAmount: item.totalAmount,
      count: item.count,
    }));

    const barSize = Math.max(30 / chartData.length, 30);
    const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#ff0000', '#0000ff', '#00ff00', '#ff00ff', '#00ffff', '#ffff00'];
    const isNarrowScreen = window.innerWidth < 900;
    const itemWidthPercentage = isNarrowScreen ? 15 : 10;
    const minScreenWidthPercentage = isNarrowScreen ? 80 : 40;

    // Separate render functions for bar and line labels
    const renderBarLabel = (props: any) => {
      return <BarCustomLabel {...props} />;
    };

    const renderLineLabel = (props: any) => {
      return <LineCustomLabel {...props} />;
    };

    return (
      <div className='charts-container'>
        <ResponsiveContainer width={`${Math.min(Math.max(chartData.length * itemWidthPercentage, minScreenWidthPercentage), 100)}%`} height={300}>
          <BarChart data={chartData} style={{ backgroundColor: '#fafafa' }} margin={{ top: 30, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray='3 3' />
            <XAxis dataKey='day'>
              <Label value='Day of Month' position='bottom' offset={-7} />
            </XAxis>
            <YAxis tick={CustomYAxisTick} />
            <Tooltip />
            <Legend />
            <Bar dataKey='totalAmount' name='Total transactions amount' barSize={barSize} label={renderBarLabel} isAnimationActive={false}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        <ResponsiveContainer width={`${Math.min(Math.max(chartData.length * itemWidthPercentage, minScreenWidthPercentage), 100)}%`} height={300}>
          <LineChart data={chartData} style={{ backgroundColor: '#fafafa' }} margin={{ top: 30, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray='3 3' />
            <XAxis dataKey='day'>
              <Label value='Day of Month' position='bottom' offset={-7} />
            </XAxis>
            <YAxis
              label={{
                value: 'Count',
                angle: 90,
                position: 'insideLeft',
                offset: 10,
              }}
            />
            <Tooltip />
            <Legend />
            <Line
              type='monotone'
              dataKey='count'
              name='Total transactions count'
              stroke={colors[0]}
              strokeWidth={2}
              label={renderLineLabel}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }
}

const mapStateToProps = (state: AppState) => ({
  analyticsData: state.transactions.analyticsData,
});

export default connect(mapStateToProps)(AccountsAnalytics);
