import React, { useEffect, useRef, useState } from 'react'
import 'ol/ol.css'
import Map from 'ol/Map'
import View from 'ol/View'
import TileLayer from 'ol/layer/Tile'
import OSM from 'ol/source/OSM'
import TileWMS from 'ol/source/TileWMS'
import './Map2.css'

const createWMSLayer = (layerName, visible) => {
	return new TileLayer({
		source: new TileWMS({
			url:
				process.env.REACT_APP_GEOSERVER_URL ||
				'http://localhost:8080/geoserver/wms',
			params: { LAYERS: layerName, TILED: true },
			serverType: 'geoserver',
		}),
		visible,
	})
}

const Map2 = () => {
	const mapContainerRef = useRef(null)
	const statesLayerRef = useRef(null)
	const roadsLayerRef = useRef(null)
	const waterLayerRef = useRef(null)
	const worldLayerRef = useRef(null)

	const [statesChecked, setStatesChecked] = useState(false)
	const [roadsChecked, setRoadsChecked] = useState(false)
	const [waterChecked, setWaterChecked] = useState(false)
	const [worldChecked, setWorldChecked] = useState(false)

	useEffect(() => {
		const osmLayer = new TileLayer({
			source: new OSM(),
		})

		statesLayerRef.current = createWMSLayer('topp:states', statesChecked)
		roadsLayerRef.current = createWMSLayer('topp:tasmania_roads', roadsChecked)
		waterLayerRef.current = createWMSLayer(
			'topp:tasmania_water_bodies',
			waterChecked
		)
		worldLayerRef.current = createWMSLayer('ne:world', worldChecked)

		const map = new Map({
			target: mapContainerRef.current,
			layers: [
				osmLayer,
				worldLayerRef.current,
				statesLayerRef.current,
				roadsLayerRef.current,
				waterLayerRef.current,
			],
			view: new View({
				center: [0, 0],
				zoom: 2,
			}),
		})

		return () => map.setTarget(null)
	}, [])

	useEffect(() => {
		if (statesLayerRef.current) {
			statesLayerRef.current.setVisible(statesChecked)
		}
		if (roadsLayerRef.current) {
			roadsLayerRef.current.setVisible(roadsChecked)
		}
		if (waterLayerRef.current) {
			waterLayerRef.current.setVisible(waterChecked)
		}
		if (worldLayerRef.current) {
			worldLayerRef.current.setVisible(worldChecked)
		}
	}, [statesChecked, roadsChecked, waterChecked, worldChecked])

	return (
		<div className='map2-container'>
			<div className='map2-menu'>
				<div className='checkbox-group'>
					<label>
						<input
							type='checkbox'
							checked={statesChecked}
							onChange={e => setStatesChecked(e.target.checked)}
						/>
						<span>topp:states</span>
					</label>
					<label>
						<input
							type='checkbox'
							checked={roadsChecked}
							onChange={e => setRoadsChecked(e.target.checked)}
						/>
						<span>topp:tasmania_roads</span>
					</label>
					<label>
						<input
							type='checkbox'
							checked={waterChecked}
							onChange={e => setWaterChecked(e.target.checked)}
						/>
						<span>topp:tasmania_water_bodies</span>
					</label>
					<label>
						<input
							type='checkbox'
							checked={worldChecked}
							onChange={e => setWorldChecked(e.target.checked)}
						/>
						<span>ne:world</span>
					</label>
				</div>
			</div>
			<div ref={mapContainerRef} className='map2'></div>
		</div>
	)
}

export default Map2
