import {
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Line,
} from 'recharts';
import { useEffect, useState } from 'react';
import { useRequest } from '@/hooks/useRequest';
import { Box, Text, useMediaQuery } from '@chakra-ui/react';
import ChartWrapper from '../../common/chartWrapper';
import { BRIGHT_GREEN, CHART_HEIGHT, YAXIS_WIDTH } from '../../../constants';
import {
  yaxisFormatter,
  xAxisFormatter,
  tooltipFormatterCurrency,
  tooltipLabelFormatter,
} from '../../../helpers';
import { total_volume } from '../../../constants/api';
import { getTokenHex } from '@/constants/tokens';

const REQUESTS = [total_volume];

export default function TotalVolumeChart() {
  const [isMobile] = useMediaQuery('(max-width: 700px)');
  const [formattedData, setFormattedData] = useState<any[]>([]);
  const [coins, setCoins] = useState<string[]>([]);
  const [dataTotalVolume, loading, error] = useRequest(REQUESTS[0], [], 'chart_data');

  interface TotalVolume {
    time: string;
    total_volume: number;
    coin: string;
  }

  interface MergedData {
    time: Date;
    total: number;
    [coin: string]: any;
    cumulative: number;
    unit: string;
    Other: number;
  }

  const makeFormattedData = (dataTotalVolume: TotalVolume[]): [MergedData[], string[]] => {
    const map = new Map<string, MergedData>();
    const uniqueTopCoins = new Set<string>();

    let cumulative = 0;
    dataTotalVolume.forEach((item: TotalVolume) => {
      let { time, coin, total_volume } = item;
      cumulative += total_volume;
      if (!map.has(time)) {
        map.set(time, {
          time: new Date(time),
          total: total_volume,
          [`${coin}`]: total_volume,
          cumulative: cumulative,
          Other: 0,
          unit: '$',
        });
      } else {
        const existingEntry = map.get(time)!;
        existingEntry[`${coin}`] = (existingEntry[`${coin}`] || 0) + total_volume;
        existingEntry.total += total_volume;
        existingEntry.cumulative = cumulative;
      }
    });

    map.forEach((entry) => {
      const coinEntries = Object.entries(entry).filter(
        ([key]) =>
          key !== 'time' &&
          key !== 'total' &&
          key !== 'cumulative' &&
          key !== 'other' &&
          key !== 'unit'
      );
      const sortedCoinEntries = coinEntries.sort(
        (a, b) => Math.abs(Number(b[1])) - Math.abs(Number(a[1]))
      );
      const topCoins = sortedCoinEntries.slice(0, 10).map(([coin]) => coin);
      const otherCoins = sortedCoinEntries.slice(10);

      topCoins.forEach((coin) => uniqueTopCoins.add(coin));

      let otherTotal = 0;
      otherCoins.forEach(([coin, value]) => {
        otherTotal += value;
        delete entry[coin];
      });
      entry.Other = otherTotal;
    });

    const result = Array.from(map.values());
    uniqueTopCoins.add('Other');
    return [result, Array.from(uniqueTopCoins)];
  };

  const formatData = () => {
    const [newFormattedData, coins] = makeFormattedData(dataTotalVolume);
    setCoins(coins);
    setFormattedData(newFormattedData);
  };

  useEffect(() => {
    if (!loading && !error) {
      formatData();
    }
  }, [loading, error]);

  return (
    <ChartWrapper title='Total Volume' loading={loading} data={formattedData}>
      <ResponsiveContainer width='99%' height={CHART_HEIGHT}>
        <ComposedChart data={formattedData}>
          <CartesianGrid strokeDasharray='15 15' opacity={0.1} />
          <XAxis
            dataKey='time'
            tickFormatter={xAxisFormatter}
            minTickGap={30}
            tick={{ fill: '#f9f9f9', fontSize: isMobile ? 14 : 15 }}
            tickMargin={10}
          />
          <YAxis
            dataKey='total'
            interval='preserveStartEnd'
            tickCount={7}
            tickFormatter={yaxisFormatter}
            width={70}
            tick={{ fill: '#f9f9f9', fontSize: isMobile ? 14 : 15 }}
          />
          <YAxis
            dataKey='cumulative'
            orientation='right'
            yAxisId='right'
            tickFormatter={yaxisFormatter}
            width={YAXIS_WIDTH}
            tick={{ fill: '#f9f9f9', fontSize: isMobile ? 14 : 15 }}
          />
          <Legend wrapperStyle={{ bottom: -5 }} />
          {coins.map((coin, i) => {
            return (
              <Bar
                unit={''}
                isAnimationActive={false}
                type='monotone'
                dataKey={coin}
                stackId='a'
                name={coin.toString()}
                fill={getTokenHex(coin.toString())}
                key={i}
                maxBarSize={20}
              />
            );
          })}
          <Line
            isAnimationActive={false}
            type='monotone'
            dot={false}
            strokeWidth={1}
            stroke={BRIGHT_GREEN}
            dataKey='cumulative'
            yAxisId='right'
            opacity={0.7}
            name='Cumulative'
          />
          <Tooltip
            formatter={tooltipFormatterCurrency}
            labelFormatter={(label, args) => tooltipLabelFormatter(label, args, 'total')}
            contentStyle={{
              textAlign: 'left',
              background: '#0A1F1B',
              borderColor: '#061412',
              color: '#fff',
              boxShadow: '0px 0px 7px rgb(0 0 0 / 20%)',
              borderRadius: '26px',
              maxHeight: '500px',
            }}
            itemSorter={(item) => {
              return Number(item.value) * -1;
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>
      <Box w='100%' mt='3'>
        <Text color='#bbb'>
          Top 10 Coins grouped daily and remaining coins grouped by Other. Volume tracked since
          introduction of fees.
        </Text>
      </Box>
    </ChartWrapper>
  );
}