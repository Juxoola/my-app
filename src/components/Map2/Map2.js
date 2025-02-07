import React, { useEffect, useRef, useState } from 'react'
import 'ol/ol.css'
import Map from 'ol/Map'
import View from 'ol/View'
import TileLayer from 'ol/layer/Tile'
import OSM from 'ol/source/OSM'
import TileWMS from 'ol/source/TileWMS'
import { FormGroup, FormControlLabel, Checkbox, Box } from '@mui/material'
import './Map2.css'

const Map2 = () => {
	const mapRef = useRef(null)

	const statesLayerRef = useRef(null)
	const roadsLayerRef = useRef(null)
	const waterLayerRef = useRef(null)

	const [statesChecked, setStatesChecked] = useState(false)
	const [roadsChecked, setRoadsChecked] = useState(false)
	const [waterChecked, setWaterChecked] = useState(false)

	useEffect(() => {
		const osmLayer = new TileLayer({
			source: new OSM(),
		})

		statesLayerRef.current = new TileLayer({
			source: new TileWMS({
				url: 'http://localhost:8080/geoserver/wms',
				params: { LAYERS: 'topp:states', TILED: true },
				serverType: 'geoserver',
			}),
			visible: statesChecked,
		})

		roadsLayerRef.current = new TileLayer({
			source: new TileWMS({
				url: 'http://localhost:8080/geoserver/wms',
				params: { LAYERS: 'topp:tasmania_roads', TILED: true },
				serverType: 'geoserver',
			}),
			visible: roadsChecked,
		})

		waterLayerRef.current = new TileLayer({
			source: new TileWMS({
				url: 'http://localhost:8080/geoserver/wms',
				params: { LAYERS: 'topp:tasmania_water_bodies', TILED: true },
				serverType: 'geoserver',
			}),
			visible: waterChecked,
		})

		const map = new Map({
			target: mapRef.current,
			layers: [
				osmLayer,
				statesLayerRef.current,
				roadsLayerRef.current,
				waterLayerRef.current,
			],
			view: new View({
				center: [0, 0],
				zoom: 2,
			}),
		})
		mapRef.current = map

		return () => map.setTarget(null)
	}, [])

	useEffect(() => {
		if (statesLayerRef.current) {
			statesLayerRef.current.setVisible(statesChecked)
		}
	}, [statesChecked])

	useEffect(() => {
		if (roadsLayerRef.current) {
			roadsLayerRef.current.setVisible(roadsChecked)
		}
	}, [roadsChecked])

	useEffect(() => {
		if (waterLayerRef.current) {
			waterLayerRef.current.setVisible(waterChecked)
		}
	}, [waterChecked])

	return (
		<Box className='map2-container'>
			<Box className='map2-menu'>
				<FormGroup row>
					<FormControlLabel
						control={
							<Checkbox
								checked={statesChecked}
								onChange={e => setStatesChecked(e.target.checked)}
							/>
						}
						label='topp:states'
					/>
					<FormControlLabel
						control={
							<Checkbox
								checked={roadsChecked}
								onChange={e => setRoadsChecked(e.target.checked)}
							/>
						}
						label='topp:tasmania_roads'
					/>
					<FormControlLabel
						control={
							<Checkbox
								checked={waterChecked}
								onChange={e => setWaterChecked(e.target.checked)}
							/>
						}
						label='topp:tasmania_water_bodies'
					/>
				</FormGroup>
			</Box>
			<div ref={mapRef} className='map2'></div>
		</Box>
	)
}

export default Map2
